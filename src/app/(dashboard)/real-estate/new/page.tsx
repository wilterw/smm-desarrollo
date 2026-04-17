"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./Builder.module.css";

export default function NewDynamicCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCatalogId = searchParams.get("catalogId") || "";

  const [saving, setSaving] = useState(false);
  const [catalogs, setCatalogs] = useState<{ id: string, name: string }[]>([]);

  const [activeStep, setActiveStep] = useState(1);

  // Scraper & Tools State
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [hashtagsStr, setHashtagsStr] = useState("");
  const [isTranslating, setIsTranslating] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    catalogId: preselectedCatalogId,
    newCatalogName: "",
    businessId: "", // ID de Business Manager para Meta
    name: "",
    description: "",
    price: "",
    currency: "EUR",
    availability: "for_sale",
    address: "",
    city: "",
    state: "",
    country: "ES",
    propertyType: "house",
    listingUrl: ""
  });

  useEffect(() => {
    fetch("/api/real-estate/catalogs")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
           setCatalogs(data);
           // If we came directly with no predefined catalog and there are catalogs, set step 2
           if (!preselectedCatalogId && data.length > 0) {
              setFormData(p => ({ ...p, catalogId: data[0].id }));
           }
           if (preselectedCatalogId) setActiveStep(2); // Jump strictly to item if we are adding internally
        }
      });
  }, [preselectedCatalogId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleScrapeLink = async () => {
    if (!scrapeUrl.trim() || !scrapeUrl.startsWith("http")) {
      alert("Ingresa una URL (http/https) válida.");
      return;
    }
    setScrapingLoading(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl })
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(p => ({
          ...p,
          name: p.name || data.title || "",
          description: p.description || data.description || "",
          listingUrl: p.listingUrl || data.linkUrl || "",
          price: p.price || data.price || "",
          city: p.city || data.city || ""
        }));
        if (data.hashtags?.length && !hashtagsStr) setHashtagsStr(data.hashtags.join(", "));
        
        setScrapedImages(data.images || []);
        
        // Auto-select first few images if empty
        if (data.images?.length > 0 && selectedImages.length === 0) {
           setSelectedImages(data.images.slice(0, 5));
        }
      } else {
        alert("No se pudo extraer información del enlace.");
      }
    } catch {
      alert("Error al procesar el enlace.");
    } finally {
      setScrapingLoading(false);
    }
  };

  const handleTranslate = async (langCode: string) => {
    if (!formData.name && !formData.description) return;
    setIsTranslating(langCode);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.name,
          description: formData.description,
          hashtags: hashtagsStr,
          targetLanguage: langCode
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error de traducción");

      setFormData(p => ({
         ...p,
         name: data.title || p.name,
         description: data.description || p.description
      }));
      if (data.hashtags) setHashtagsStr(data.hashtags);
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTranslating(null);
    }
  };

  const handleImageToggle = (img: string) => {
     if (selectedImages.includes(img)) {
        setSelectedImages(selectedImages.filter(i => i !== img));
     } else {
        setSelectedImages([...selectedImages, img]);
     }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.catalogId && !formData.newCatalogName) {
       alert("Debes seleccionar un catálogo padre o crear uno nuevo.");
       return;
    }
    if (!formData.name || !formData.price || selectedImages.length === 0) {
       alert("Completa Título, Precio y mínimo UNA imagen para continuar.");
       return;
    }

    setSaving(true);
    try {
      // Append description hashtags if any
      let finalDescription = formData.description;
      if (hashtagsStr) {
         finalDescription += `\n\n${hashtagsStr}`;
      }

      const payload = {
        ...formData,
        description: finalDescription,
        imageUrl: selectedImages[0], // Main image
        images: selectedImages // All images
      };

      const res = await fetch("/api/real-estate/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const item = await res.json();
        router.push(`/real-estate/${item.catalogId}`);
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear el ítem");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainLayout}>
        {/* LEFT NAV: The "Tree" */}
        <div className={styles.leftNav}>
          <div className={`${styles.navIconWrapper} ${activeStep === 1 ? styles.navIconActive : ""}`} title="Catálogo" onClick={() => setActiveStep(1)}>
            <div style={{ fontSize: "1.5rem" }}>📁</div>
            <span className={styles.navIconLabel}>Catálogo</span>
          </div>
          <div className={`${styles.navIconWrapper} ${activeStep === 2 ? styles.navIconActive : ""}`} title="Primer Ítem" onClick={() => setActiveStep(2)}>
            <div style={{ fontSize: "1.5rem" }}>🏢</div>
            <span className={styles.navIconLabel}>Ítem</span>
          </div>
        </div>

        {/* CENTER AREA: Form Cards */}
        <div className={styles.centerArea}>
          <div className={styles.cardHeader} style={{ background: "transparent", border: "none", margin: "0", paddingBottom: "0" }}>
             <h2 className={styles.cardTitle} style={{ fontSize: "1.5rem" }}>Crear Ítem / Campaña</h2>
             <Link href="/real-estate" className={styles.btnSecondary} style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}>← Volver</Link>
          </div>

          {/* Card 1: Catalog */}
          <div className={styles.configCard} style={activeStep === 2 ? { opacity: 0.5 } : {}}>
             <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>📁 1. Configuración de Campaña (Catálogo)</span>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Asignar a Campaña Existente</label>
              <select name="catalogId" className={styles.select} value={formData.catalogId} onChange={(e) => { handleChange(e); setFormData(p => ({ ...p, newCatalogName: "" })); }}>
                <option value="">-- No, crear una completamente nueva --</option>
                {catalogs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {!formData.catalogId && (
              <div style={{ marginTop: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre de tu Nueva Campaña Dinámica *</label>
                  <input name="newCatalogName" className={styles.input} placeholder="Ej: Inmuebles Madrid 2024" value={formData.newCatalogName} onChange={handleChange} />
                </div>
                <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
                  <label className={styles.label}>ID de Business Manager (Opcional - Sincroniza desde el primer ítem)</label>
                  <input name="businessId" className={styles.input} placeholder="Ej: 10459381..." value={formData.businessId} onChange={handleChange} />
                  <small style={{ color: "var(--text-muted)", marginTop: "4px" }}>Para enviar este catálogo nativamente a Facebook Ads</small>
                </div>
              </div>
            )}
            
            {activeStep === 1 && (
              <button className={styles.btnSecondary} style={{ marginTop: "1rem" }} onClick={() => setActiveStep(2)}>Siguiente: Configurar Propiedad ⬇️</button>
            )}
          </div>

          <div className={styles.configCard} style={activeStep === 1 ? { opacity: 0.5, pointerEvents: "none" } : {}}>
             <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>🛠️ 2. Herramientas de Extracción (Scraper IA)</span>
              <span style={{ fontSize: "0.75rem", background: "rgba(196,26,26,0.1)", color: "var(--accent-primary)", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>Mágico</span>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Importar datos desde URL de la Propiedad</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input 
                  className={styles.input} 
                  placeholder="https://idealista.com/... o mhestate.es/..." 
                  value={scrapeUrl} 
                  onChange={(e) => setScrapeUrl(e.target.value)} 
                  disabled={scrapingLoading}
                  style={{ flex: 1 }}
                />
                <button type="button" className={styles.btnPrimary} onClick={handleScrapeLink} disabled={scrapingLoading} style={{ padding: "0 1rem" }}>
                  {scrapingLoading ? "Extrayendo..." : "🔗 Extraer"}
                </button>
              </div>
            </div>

            {scrapedImages.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <p className={styles.label} style={{ marginBottom: "0.5rem" }}>Imágenes Detectadas (Clic para incluir al Catálogo):</p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", maxHeight: "150px", overflowY: "auto" }}>
                  {scrapedImages.map((img, idx) => {
                     const isSelected = selectedImages.includes(img);
                     return (
                        <div key={idx} style={{ position: "relative", cursor: "pointer" }} onClick={() => handleImageToggle(img)}>
                          <img 
                            src={img} 
                            alt={`Scraped ${idx}`} 
                            style={{ 
                              width: "70px", height: "70px", objectFit: "cover", borderRadius: "6px", 
                              border: isSelected ? "3px solid var(--accent-primary)" : "1px solid var(--border-color)",
                              opacity: isSelected ? 1 : 0.5
                            }}
                          />
                          {isSelected && <div style={{ position: "absolute", top: -5, right: -5, background: "var(--accent-primary)", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>✓</div>}
                        </div>
                     );
                  })}
                </div>
              </div>
            )}
            
            <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
              <label className={styles.label}>Traductor Automático de Ficha</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[
                  { code: "es", label: "🇪🇸 Español" },
                  { code: "en", label: "🇬🇧 Inglés" },
                  { code: "sv", label: "🇸🇪 Sueco" }
                ].map(lang => (
                  <button 
                    key={lang.code}
                    type="button" 
                    onClick={() => handleTranslate(lang.code)} 
                    disabled={!!isTranslating || !formData.name}
                    className={styles.btnSecondary}
                    style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem", background: isTranslating === lang.code ? "rgba(196,26,26,0.1)" : "" }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.configCard} style={activeStep === 1 ? { opacity: 0.5, pointerEvents: "none" } : {}}>
             <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>🏢 3. Detalles de la Propiedad (Ítem)</span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Título Corto *</label>
                <input name="name" className={styles.input} placeholder="Vila en Marbella" value={formData.name} onChange={handleChange} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Disponibilidad</label>
                <select name="availability" className={styles.select} value={formData.availability} onChange={handleChange}>
                  <option value="for_sale">En Venta</option>
                  <option value="for_rent">En Alquiler</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
               <div className={styles.formGroup}>
                 <label className={styles.label}>Precio *</label>
                 <input type="number" name="price" className={styles.input} value={formData.price} onChange={handleChange} required />
               </div>
               <div className={styles.formGroup}>
                 <label className={styles.label}>Moneda</label>
                 <input name="currency" className={styles.input} value={formData.currency} onChange={handleChange} maxLength={3} />
               </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Descripción</label>
              <textarea name="description" className={styles.textarea} style={{ height: "100px", resize: "vertical" }} value={formData.description} onChange={handleChange} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Hashtags (Opcional)</label>
              <input value={hashtagsStr} placeholder="#inmueble #madrid" onChange={(e) => setHashtagsStr(e.target.value)} className={styles.input} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
               <div className={styles.formGroup}>
                 <label className={styles.label}>Ciudad *</label>
                 <input name="city" className={styles.input} placeholder="Málaga" value={formData.city} onChange={handleChange} required />
               </div>
               <div className={styles.formGroup}>
                 <label className={styles.label}>Enlace Destino (Tu Web)</label>
                 <input type="url" name="listingUrl" className={styles.input} placeholder="https://..." value={formData.listingUrl} onChange={handleChange} />
               </div>
            </div>
            
            {/* Componente para agregar URL de imagen manual, si no quiso usar el scrape */}
            {selectedImages.length === 0 && (
               <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
                 <label className={styles.label}>URL Imagen Principal Manual (Si no usas Extractor)</label>
                 <input 
                   type="url" 
                   className={styles.input} 
                   placeholder="https://..." 
                   onChange={(e) => {
                      if (e.target.value) setSelectedImages([e.target.value]);
                   }}
                 />
                 <small style={{ color: "var(--warning)", marginTop: "4px" }}>Nota: Para subir fotos es mejor usar el Auto Extractor de URL de arriba.</small>
               </div>
            )}
          </div>
          
          <div style={{ height: "40px" }} />
        </div>

        {/* RIGHT SIDEBAR: Sticky Previews */}
        <div className={styles.rightSidebar}>
          <div className={styles.stickyPreview}>
            <div className={styles.cardHeader} style={{ background: "transparent", border: "none", marginBottom: "1rem" }}>
              <span className={styles.cardTitle}>Vista Previa en Tiempo Real</span>
            </div>

            <div className={styles.previewBox}>
              <div className={styles.previewMedia}>
                {selectedImages.length > 0 ? (
                  <img src={selectedImages[0]} className={styles.previewImg} alt="Preview" />
                ) : (
                  <span style={{ color: "#666" }}>Ninguna Imagen Asignada</span>
                )}
              </div>
              <div className={styles.previewBody}>
                 <div className={styles.previewTitle}>{formData.name || "Título de la propiedad..."}</div>
                 <div className={styles.previewPrice}>
                    {formData.price ? `${Number(formData.price).toLocaleString()} ${formData.currency}` : "Precio..."}
                 </div>
                 <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    📍 {formData.city || "Ciudad..."} <br/>
                    {formData.availability === "for_rent" ? "🔑 Alquiler" : "🏠 Venta"}
                 </div>
                 {hashtagsStr && <div style={{ color: "var(--accent-primary)", fontSize: "0.8rem", marginTop: "0.5rem" }}>{hashtagsStr}</div>}
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderTop: "1px solid var(--border-color)", textAlign: "center", fontSize: "0.85rem", color: "var(--accent-primary)", fontWeight: "600" }}>
                 Elemento Dinámico Advantage+
              </div>
            </div>
            
            {/* Additional preview info */}
            <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "8px" }}>
              <b>📸 Imágenes totales asigadas:</b> {selectedImages.length}
              <br/><br/>
              Este ítem alimentará el <b>feed XML dinámico</b> en tiempo real. En Meta, los usuarios deslizarán por el carrusel de fotografías mostrando los precios actualizados.
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR: Save Actions */}
      <div className={styles.bottomBar}>
        <button type="button" className={styles.btnSecondary} onClick={() => router.push("/real-estate")}>Descartar</button>
        <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving ? "Guardando..." : "Guardar Ítem a la Campaña →"}
        </button>
      </div>
    </div>
  );
}
