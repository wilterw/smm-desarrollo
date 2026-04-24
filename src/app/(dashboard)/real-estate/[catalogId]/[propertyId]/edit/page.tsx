"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../../../new/Builder.module.css";
import React from "react";

function EditPropertyView({ catalogId, propertyId }: { catalogId: string, propertyId: string }) {
  const router = useRouter();
  
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("facebook");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [hashtagsStr, setHashtagsStr] = useState("");
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [catalogs, setCatalogs] = useState<{ id: string, name: string }[]>([]);

  const [formData, setFormData] = useState({
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
    // Load catalogs
    fetch("/api/real-estate/catalogs")
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCatalogs(data); });

    // Load property data
    fetch(`/api/real-estate/properties?id=${propertyId}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
           let desc = data.description || "";
           let tags = "";
           
           // Separar hashtags del final si existen
           const parts = desc.split("\n\n#");
           if (parts.length > 1) {
              const possibleTags = "#" + parts.pop();
              if (possibleTags.split(" ").every((t: string) => t.startsWith("#"))) {
                 tags = possibleTags;
                 desc = parts.join("\n\n#");
              } else {
                 desc = data.description;
              }
           }
           
           setHashtagsStr(tags);
           setFormData({
              name: data.name || "",
              description: desc,
              price: data.price ? String(data.price) : "",
              currency: data.currency || "EUR",
              availability: data.availability || "for_sale",
              address: data.address || "",
              city: data.city || "",
              state: data.state || "",
              country: data.country || "ES",
              propertyType: data.propertyType || "house",
              listingUrl: data.listingUrl || ""
           });

           const imgs = [data.imageUrl];
           if (data.images) {
              try {
                const extras = JSON.parse(data.images);
                extras.forEach((u: string) => { if (u !== data.imageUrl) imgs.push(u); });
              } catch(e) {}
           }
           setSelectedImages(imgs.filter(Boolean));
        }
      })
      .finally(() => setLoadingConfig(false));
  }, [propertyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingMedia(true);
    const newUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) { alert(`El archivo ${file.name} no es una imagen válida`); continue; }
        const ext = file.name.split('.').pop();
        const newName = `prop_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
        const renFile = new File([file], newName, { type: file.type });
        const formDataData = new FormData();
        formDataData.append("file", renFile);
        
        try {
            const res = await fetch("/api/upload", { method: "POST", body: formDataData });
            if (res.ok) {
                const data = await res.json();
                newUrls.push(data.url);
            }
        } catch { }
    }
    
    if (newUrls.length > 0) setSelectedImages([...selectedImages, ...newUrls]);
    setUploadingMedia(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || selectedImages.length === 0) {
       alert("Completa Título, Precio y mínimo UNA imagen para continuar.");
       return;
    }

    setSaving(true);
    try {
      let finalDescription = formData.description;
      if (hashtagsStr) finalDescription += `\n\n${hashtagsStr}`;

      const payload = {
        id: propertyId,
        ...formData,
        description: finalDescription,
        imageUrl: selectedImages[0], 
        images: selectedImages 
      };

      const res = await fetch("/api/real-estate/properties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push(`/real-estate/${catalogId}`);
      } else {
        const err = await res.json();
        alert(err.error || "Error al actualizar el ítem");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loadingConfig) return <div className={styles.container} style={{ padding: "2rem" }}>Cargando datos...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.mainLayout}>
        <div className={styles.leftNav}>
          <div className={`${styles.navIconWrapper} ${styles.navIconActive}`} title="Editar Ítem">
            <div style={{ fontSize: "1.5rem" }}>✏️</div>
            <span className={styles.navIconLabel}>Editar</span>
          </div>
        </div>

        <div className={styles.centerArea}>
          <div className={styles.cardHeader} style={{ background: "transparent", border: "none", margin: "0", paddingBottom: "0" }}>
             <h2 className={styles.cardTitle} style={{ fontSize: "1.5rem" }}>Editar Ítem de Campaña</h2>
             <Link href={`/real-estate/${catalogId}`} className={styles.btnSecondary} style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}>← Volver</Link>
          </div>

          <div className={styles.configCard}>
             <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>🛠️ Detalles Principales</span>
              <div className={styles.buttonGroup}>
                {[ { code: "es", label: "🇪🇸" }, { code: "en", label: "🇬🇧" }, { code: "sv", label: "🇸🇪" }].map(lang => (
                  <button key={lang.code} type="button" onClick={() => handleTranslate(lang.code)} disabled={!!isTranslating} className={styles.btnSecondary} style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}>
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className={styles.grid2}>
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

            <div className={styles.grid2}>
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

            <div className={styles.grid2}>
               <div className={styles.formGroup}>
                 <label className={styles.label}>Ciudad *</label>
                 <input name="city" className={styles.input} placeholder="Málaga" value={formData.city} onChange={handleChange} required />
               </div>
               <div className={styles.formGroup}>
                 <label className={styles.label}>Enlace Destino (Tu Web)</label>
                 <input type="url" name="listingUrl" className={styles.input} placeholder="https://..." value={formData.listingUrl} onChange={handleChange} />
               </div>
            </div>
            
            <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
                <label className={styles.label}>Imágenes de la propiedad</label>
                <div 
                  className={styles.metaUpload}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent-primary)"; }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border-color)"; }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border-color)"; handleFileUpload(e.dataTransfer.files); }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{uploadingMedia ? "⏳" : "📥"}</div>
                  <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{uploadingMedia ? "Subiendo..." : "Arrastra imágenes aquí o selecciona"}</div>
                  <label className={styles.btnSecondary} style={{ padding: "0.5rem 1.5rem", display: "inline-block", cursor: "pointer", marginTop: "1rem" }}>
                    Subir Nuevas
                    <input type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileUpload(e.target.files)} disabled={uploadingMedia}/>
                  </label>
                </div>
            </div>
          </div>
          <div style={{ height: "40px" }} />
        </div>

        <div className={styles.rightSidebar}>
          <div className={styles.stickyPreview}>
            <div className={styles.previewTabs}>
               <div className={`${styles.previewTab} ${activeTab === 'facebook' ? styles.previewTabActive : ''}`} onClick={() => { setActiveTab('facebook'); setCurrentSlide(0); }}>
                 <img src="/images/facebook.png" alt="FB" width={16} height={16} /> Facebook
               </div>
               <div className={`${styles.previewTab} ${activeTab === 'instagram' ? styles.previewTabActive : ''}`} onClick={() => { setActiveTab('instagram'); setCurrentSlide(0); }}>
                 <img src="/images/instagram.png" alt="IG" width={16} height={16} /> Instagram
               </div>
            </div>

            <div className={styles.previewBox}>
               {activeTab === 'facebook' ? (
                  <>
                     <div className={styles.fbPostHeader}>
                        <div className={styles.fbAvatar}>A</div>
                        <div>
                           <div className={styles.fbName}>Agencia Inmobiliaria</div>
                           <div className={styles.fbTime}>Publicidad • 🌍</div>
                        </div>
                     </div>
                     <div className={styles.fbText}>
                        {formData.description ? (formData.description.length > 90 ? formData.description.substring(0, 90) + '...' : formData.description) : 'Descripción de la propiedad...'}
                        {hashtagsStr && <div style={{ color: "var(--accent-primary)", marginTop: "0.25rem" }}>{hashtagsStr}</div>}
                     </div>
                  </>
               ) : (
                  <div className={styles.igPostHeader}>
                     <div className={styles.igAvatar}><div className={styles.igAvatarInner}>AG</div></div>
                     <div className={styles.igName}>agencia.inmobiliaria</div>
                  </div>
               )}

              <div className={styles.previewMedia}>
                {selectedImages.length > 0 ? (
                  <>
                     <img src={selectedImages[currentSlide]} className={styles.previewImg} alt="Preview" />
                     {selectedImages.length > 1 && (
                        <>
                           {currentSlide > 0 && <button className={styles.carouselArrow} style={{ left: 10 }} onClick={() => setCurrentSlide(c => c - 1)}>◀</button>}
                           {currentSlide < selectedImages.length - 1 && <button className={styles.carouselArrow} style={{ right: 10 }} onClick={() => setCurrentSlide(c => c + 1)}>▶</button>}
                           <div className={styles.carouselDots}>
                              {selectedImages.map((_, idx) => (
                                 <div key={idx} className={`${styles.carouselDot} ${currentSlide === idx ? styles.carouselDotActive : ''}`} onClick={() => setCurrentSlide(idx)} />
                              ))}
                           </div>
                        </>
                     )}
                     <div className={styles.priceOverlay}>
                        <div className={styles.priceOverlayPrice}>{formData.price ? `${Number(formData.price).toLocaleString()} ${formData.currency}` : "Precio..."}</div>
                        <div className={styles.priceOverlayAction}>{formData.availability === "for_rent" ? "ALQUILAR" : "COMPRAR"}</div>
                     </div>
                  </>
                ) : (
                  <span style={{ color: "#666" }}>Ninguna Imagen Asignada</span>
                )}
              </div>
              
              <div className={styles.previewBody} style={{ borderBottom: activeTab === 'facebook' ? '1px solid var(--border-color)' : 'none' }}>
                 <div className={styles.previewTitle}>{formData.name || "Título de la propiedad..."}</div>
                 <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>📍 {formData.city || "Ciudad..."}</div>
              </div>
              
              {activeTab === 'instagram' && (
                 <>
                    <div className={styles.igActions}>❤️ 💬 🚀</div>
                    <div className={styles.igText}>
                       <b>agencia.inmobiliaria</b> {formData.description ? (formData.description.length > 90 ? formData.description.substring(0, 90) + '...' : formData.description) : 'Descripción de la propiedad...'}
                       {hashtagsStr && <div style={{ color: "var(--accent-primary)", marginTop: "0.25rem" }}>{hashtagsStr}</div>}
                    </div>
                 </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <button type="button" className={styles.btnSecondary} onClick={() => router.push(`/real-estate/${catalogId}`)}>Descartar Cambios</button>
        <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving ? "Guardando..." : "Guardar Cambios →"}
        </button>
      </div>
    </div>
  );
}

export default function EditPropertyPage({ params }: { params: Promise<{ catalogId: string, propertyId: string }> }) {
  const { catalogId, propertyId } = React.use(params);
  return <EditPropertyView catalogId={catalogId} propertyId={propertyId} />;
}
