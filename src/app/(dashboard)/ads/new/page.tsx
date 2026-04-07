"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./AdForm.module.css";

type Campaign = { id: string; name: string; hashtags?: string; firstComment?: string };

export default function NewAdPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCampaignId = searchParams.get("campaignId") || "";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Preview Logic
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [previewTab, setPreviewTab] = useState<"facebook" | "instagram" | "youtube">("facebook");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // New campaign modal state
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Scraper state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);

  // Form state
  const [campaignId, setCampaignId] = useState(preselectedCampaignId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  
  // New campaign metadata state
  const [hashtagsStr, setHashtagsStr] = useState("");
  const [firstComment, setFirstComment] = useState("");

  // Translation state
  const [isTranslating, setIsTranslating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns").then(r => r.json()).then(setCampaigns).catch(() => {});
  }, []);

  // When campaign changes, populate hashtags/firstComment if they exist
  useEffect(() => {
    if (campaignId) {
      const camp = campaigns.find(c => c.id === campaignId);
      if (camp) {
        if (camp.hashtags && !hashtagsStr) setHashtagsStr(camp.hashtags);
        if (camp.firstComment && !firstComment) setFirstComment(camp.firstComment);
      }
    }
  }, [campaignId, campaigns]);

  const mediaUrls = mediaUrl ? mediaUrl.split(",") : [];
  
  const handleRemoveMedia = (urlToRemove: string) => {
    const updated = mediaUrls.filter((u) => u !== urlToRemove);
    setMediaUrl(updated.join(","));
  };
  
  const handleAddMedia = (urlToAdd: string) => {
    const updated = [...mediaUrls, urlToAdd];
    setMediaUrl(updated.join(","));
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    setCreatingCampaign(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCampaignName }),
      });
      if (res.ok) {
        const newCampaign = await res.json();
        setCampaigns((prev) => [...prev, newCampaign]);
        setCampaignId(newCampaign.id);
        setNewCampaignName("");
        setShowNewCampaignModal(false);
      } else {
        alert("Error al crear la campaña");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setCreatingCampaign(false);
    }
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
        if (data.title && !title) setTitle(data.title);
        if (data.description && !description) setDescription(data.description);
        if (data.hashtags?.length && !hashtagsStr) setHashtagsStr(data.hashtags.join(", "));
        if (data.suggestedComment && !firstComment) setFirstComment(data.suggestedComment);
        if (data.linkUrl && !linkUrl) setLinkUrl(data.linkUrl);
        setScrapedImages(data.images || []);
        if (data.images?.length > 0) {
          if (!mediaUrl) {
            setMediaUrl(data.images.slice(0, 4).join(","));
            setMediaType("image");
          }
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
    if (!title && !description) return;
    setIsTranslating(langCode);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          firstComment,
          hashtags: hashtagsStr,
          targetLanguage: langCode
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error de traducción");

      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.firstComment) setFirstComment(data.firstComment);
      if (data.hashtags) setHashtagsStr(data.hashtags);
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTranslating(null);
    }
  };

  const handleFileChange = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };
    
    xhr.onload = () => {
      setUploading(false);
      setUploadProgress(0);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          handleAddMedia(data.url);
          // If we had no media previously, we use the uploaded one's type
          if (!mediaUrl) {
            setMediaType(data.mediaType);
          }
        } catch(e) {
          alert("Error decodificando respuesta");
        }
      } else {
        alert("Error subiendo archivo");
      }
    };
    
    xhr.onerror = () => {
      setUploading(false);
      setUploadProgress(0);
      alert("Error de conexión al subir archivo");
    };
    
    xhr.send(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !title) {
      alert("Completa los campos obligatorios: Campaña y Título.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          campaignId, 
          title, 
          description, 
          mediaType, 
          mediaUrl,
          linkUrl,
          hashtags: hashtagsStr.trim() || undefined,
          firstComment: firstComment.trim() || undefined
        }),
      });
      if (res.ok) {
        const ad = await res.json();
        // Redirect to the new Publish Wizard
        router.push(`/ads/${ad.id}/publish`);
      } else {
        const data = await res.json();
        alert(data.error || "Error creando anuncio");
      }
    } finally {
      setSaving(false);
    }
  };

  const currentPreviewIndex = Math.min(previewImageIndex, Math.max(0, mediaUrls.length - 1));
  const filePreviewUrl = mediaUrls.length > 0 ? mediaUrls[currentPreviewIndex] : null;
  const nextPreview = () => setPreviewImageIndex(i => (i + 1) % mediaUrls.length);
  const prevPreview = () => setPreviewImageIndex(i => (i - 1 + mediaUrls.length) % mediaUrls.length);
  
  // Format hashtags for preview
  const previewHashtags = hashtagsStr.split(",").map(t => t.trim()).filter(t => t).map(t => t.startsWith("#") ? t : `#${t}`).join(" ");

  return (
    <div className={styles.container}>
      <div className={styles.mainLayout}>
        {/* LEFT NAV: The "Tree" */}
        <div className={styles.leftNav}>
          <div className={styles.navIconWrapper} title="Campaña">🚀</div>
          <div className={styles.navIconWrapper} title="Conjunto de Anuncios">🎯</div>
          <div className={`${styles.navIconWrapper} ${styles.navIconActive}`} title="Anuncio">🖼️</div>
        </div>

        {/* CENTER AREA: Form Cards */}
        <div className={styles.centerArea}>
          <div className={styles.cardHeader} style={{ background: "transparent", border: "none", marginBottom: "0" }}>
             <h2 className={styles.cardTitle} style={{ fontSize: "1.5rem" }}>Crear Nuevo Anuncio</h2>
             <Link href="/campaigns" className={styles.btnSecondary} style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}>← Volver</Link>
          </div>

          {/* Card 1: Scraper & Translation Tools */}
          <div className={styles.configCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>🛠️ Herramientas de Contenido</span>
              <span className={styles.toolBadge}>IA Power</span>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Importar desde URL</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input 
                  className={styles.input} 
                  placeholder="https://..." 
                  value={scrapeUrl} 
                  onChange={(e) => setScrapeUrl(e.target.value)} 
                  disabled={scrapingLoading}
                />
                <button type="button" className={styles.btnPrimary} onClick={handleScrapeLink} disabled={scrapingLoading}>
                  {scrapingLoading ? "..." : "🔗"}
                </button>
              </div>
            </div>
            
            <div className={styles.formGroup} style={{ marginTop: "0.5rem" }}>
              <label className={styles.label}>Idioma</label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {[
                  { code: "es", label: "ESP" },
                  { code: "en", label: "ENG" },
                  { code: "sv", label: "SVE" }
                ].map(lang => (
                  <button 
                    key={lang.code}
                    type="button" 
                    onClick={() => handleTranslate(lang.code)} 
                    disabled={!!isTranslating || !title}
                    className={styles.btnSecondary}
                    style={{ flex: 1, padding: "0.5rem 0", fontSize: "0.75rem", background: isTranslating === lang.code ? "var(--meta-accent-blue)" : "" }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {scrapedImages.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <p className={styles.label} style={{ marginBottom: "0.5rem" }}>Imágenes detectadas:</p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", maxHeight: "150px", overflowY: "auto" }}>
                  {scrapedImages.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt={`Scraped ${idx}`} 
                      onClick={() => mediaUrls.includes(img) ? handleRemoveMedia(img) : handleAddMedia(img)}
                      style={{ 
                        width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px", 
                        cursor: "pointer", border: mediaUrls.includes(img) ? "2px solid var(--meta-accent-blue)" : "1px solid var(--meta-border)",
                        opacity: mediaUrls.includes(img) ? 1 : 0.6
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Ad Identity */}
          <div className={styles.configCard}>
             <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>📱 Identidad del Anuncio</span>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Campaña *</label>
              <select className={styles.select} value={campaignId} onChange={(e) => e.target.value === "__new__" ? setShowNewCampaignModal(true) : setCampaignId(e.target.value)} required>
                <option value="">Seleccionar campaña</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new__">+ Crear nueva campaña</option>
              </select>
              {showNewCampaignModal && (
                <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                  <input className={styles.input} placeholder="Nueva campaña" value={newCampaignName} onChange={(e) => setNewCampaignName(e.target.value)} autoFocus />
                  <button type="button" className={styles.btnPrimary} onClick={handleCreateCampaign} disabled={creatingCampaign}>OK</button>
                  <button type="button" className={styles.btnSecondary} onClick={() => setShowNewCampaignModal(false)}>✕</button>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Título del Anuncio *</label>
              <input className={styles.input} placeholder="Ej: Promo Verano" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Descripción / Copy</label>
              <textarea className={styles.textarea} placeholder="Escribe el texto persuasivo..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Card 3: Multimedia */}
          <div className={styles.configCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>🖼️ Multimedia</span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Enlace de Clic (URL)</label>
              <input className={styles.input} placeholder="https://miweb.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
               <label className={styles.label}>Metadatos: Hashtags</label>
               <input className={styles.input} placeholder="marketing, ventas" value={hashtagsStr} onChange={(e) => setHashtagsStr(e.target.value)} />
            </div>

            {mediaUrls.length > 0 && (
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {mediaUrls.map((url, i) => {
                  const isVid = url.toLowerCase().endsWith(".mp4") || url.toLowerCase().endsWith(".webm");
                  return (
                    <div key={i} style={{ position: "relative", width: "100px", height: "100px" }}>
                      {isVid ? (
                        <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--meta-border)" }} muted />
                      ) : (
                        <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--meta-border)" }} />
                      )}
                      <button type="button" onClick={() => handleRemoveMedia(url)} style={{ position: "absolute", top: -5, right: -5, background: "var(--meta-accent-red)", color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "10px" }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.metaUpload} onClick={() => document.getElementById('fileInput')?.click()}>
              <input id="fileInput" type="file" style={{ display: "none" }} accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
              
              {uploading ? (
                <div style={{ width: "100%", padding: "0 2rem", textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
                  <p className={styles.label}>Subiendo... {uploadProgress}%</p>
                  <div style={{ width: "100%", height: "6px", background: "var(--meta-border)", borderRadius: "3px", marginTop: "10px", overflow: "hidden" }}>
                    <div style={{ width: `${uploadProgress}%`, height: "100%", background: "var(--meta-accent-blue)", transition: "width 0.2s" }} />
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "2rem" }}>📁</div>
                  <p className={styles.label}>Haz clic o arrastra para subir media</p>
                </>
              )}
            </div>
          </div>
          
          {/* Padding for scroll */}
          <div style={{ height: "40px" }} />
        </div>

        {/* RIGHT SIDEBAR: Sticky Previews */}
        <div className={styles.rightSidebar}>
          <div className={styles.stickyPreview}>
            <div className={styles.cardHeader} style={{ background: "transparent", border: "none", marginBottom: "1rem" }}>
              <span className={styles.cardTitle}>Vista Previa Ad</span>
            </div>

            <div className={styles.previewTabs}>
              <div className={`${styles.previewTab} ${previewTab === 'facebook' ? styles.previewTabActive : ''}`} onClick={() => setPreviewTab('facebook')}>Facebook</div>
              <div className={`${styles.previewTab} ${previewTab === 'instagram' ? styles.previewTabActive : ''}`} onClick={() => setPreviewTab('instagram')}>Instagram</div>
              <div className={`${styles.previewTab} ${previewTab === 'youtube' ? styles.previewTabActive : ''}`} onClick={() => setPreviewTab('youtube')}>YouTube</div>
            </div>

            <div style={{ marginTop: "1rem" }}>
              {previewTab === 'facebook' && (
                <div className={styles.fbPreview}>
                  <div className={styles.fbHeader}>
                    <div className={styles.fbAvatar} />
                    <div className={styles.fbMeta}>
                      <span className={styles.fbName}>Tu Marca</span>
                      <span className={styles.fbTime}>Publicidad · 🌍</span>
                    </div>
                  </div>
                  <div className={styles.fbText}>
                    {title && <b>{title}<br/></b>}
                    {description || "Contenido del anuncio..."}
                    {previewHashtags && <div style={{ color: "var(--meta-accent-blue)", marginTop: "8px" }}>{previewHashtags}</div>}
                  </div>
                  <div className={styles.fbMedia}>
                    {filePreviewUrl ? (
                      (filePreviewUrl.toLowerCase().endsWith(".mp4") || filePreviewUrl.toLowerCase().endsWith(".webm")) ? 
                        <video src={filePreviewUrl} style={{ width: "100%", background: "#000" }} controls /> : 
                        <img src={filePreviewUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : <div style={{ height: "180px", background: "#3a3b3c", display: "flex", alignItems: "center", justifyContent: "center" }}>Sin Multimedia</div>}
                  </div>
                  <div className={styles.fbActions}>
                    <span>👍 Me gusta</span>
                    <span>💬 Comentar</span>
                    <span>↗️ Compartir</span>
                  </div>
                </div>
              )}

              {previewTab === 'instagram' && (
                <div className={styles.igPreview}>
                   <div className={styles.igHeader}>
                    <div className={styles.igAvatar} />
                    <span className={styles.igName}>tu_marca</span>
                  </div>
                  <div className={styles.igMedia}>
                    {filePreviewUrl ? (
                      (filePreviewUrl.toLowerCase().endsWith(".mp4") || filePreviewUrl.toLowerCase().endsWith(".webm")) ? 
                        <video src={filePreviewUrl} style={{ width: "100%", height: "100%", objectFit: "cover", background: "#000" }} controls /> : 
                        <img src={filePreviewUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                  </div>
                  <div className={styles.igActions}><span>❤️</span><span>💬</span><span>✈️</span></div>
                  <div className={styles.igText}><b>tu_marca</b> {title} {description}</div>
                </div>
              )}
              
              {/* YouTube and comments ... simplified for brevity */}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR: Save Actions */}
      <div className={styles.bottomBar}>
        <button type="button" className={styles.btnSecondary} onClick={() => router.push("/campaigns")}>Descartar</button>
        <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving || uploading}>
          {saving ? "Guardando..." : "Crear y Publicar →"}
        </button>
      </div>
    </div>
  );
}
