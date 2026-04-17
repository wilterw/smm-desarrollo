"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../new/AdForm.module.css";

type Ad = {
  id: string;
  title: string;
  description: string | null;
  mediaType: string;
  mediaUrl: string | null;
  linkUrl: string | null;
  campaignId: string;
  campaign: {
    id: string;
    name: string;
    hashtags: string | null;
    firstComment: string | null;
  };
};

export default function EditAdPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [adInfo, setAdInfo] = useState({ clicks: 0, ctr: "0.0%" });

  // Preview Logic
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [previewTab, setPreviewTab] = useState<"facebook" | "instagram" | "youtube">("facebook");
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [hashtagsStr, setHashtagsStr] = useState("");
  const [firstComment, setFirstComment] = useState("");

  // Translation state
  const [isTranslating, setIsTranslating] = useState<string | null>(null);

  // Scraper state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await fetch(`/api/ads/${id}`);
        if (res.ok) {
          const data: Ad = await res.json();
          setAd(data);
          setTitle(data.title);
          setDescription(data.description || "");
          setMediaType(data.mediaType as "image" | "video");
          setMediaUrl(data.mediaUrl || "");
          setLinkUrl(data.linkUrl || "");
          setHashtagsStr(data.campaign.hashtags || "");
          setFirstComment(data.campaign.firstComment || "");
        } else {
          console.error("Failed to fetch ad");
        }
      } catch (error) {
        console.error("Error fetching ad:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [id]);

  const mediaUrls = mediaUrl ? mediaUrl.split(",") : [];
  
  const handleRemoveMedia = (urlToRemove: string) => {
    const updated = mediaUrls.filter((u) => u !== urlToRemove);
    setMediaUrl(updated.join(","));
  };
  
  const handleAddMedia = (urlToAdd: string) => {
    const updated = [...mediaUrls, urlToAdd];
    setMediaUrl(updated.join(","));
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

  const handleFileChange = async (file: File) => {
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
    
    // Upload immediately
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        handleAddMedia(data.url);
        setMediaType(mediaUrls.length === 0 ? data.mediaType : mediaType);
      } else {
        alert("Error subiendo archivo");
      }
    } catch {
      alert("Error de conexión al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !mediaUrl) {
      alert("Completa todos los campos obligatorios y sube un archivo multimedia.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/ads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
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
        router.push("/ads");
      } else {
        const data = await res.json();
        alert(data.error || "Error actualizando anuncio");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Cargando datos del anuncio...</div>;
  if (!ad) return <div className={styles.container}>Anuncio no encontrado</div>;

  const currentPreviewIndex = Math.min(previewImageIndex, Math.max(0, mediaUrls.length - 1));
  const filePreviewUrl = mediaUrls.length > 0 ? mediaUrls[currentPreviewIndex] : null;
  const nextPreview = () => setPreviewImageIndex(i => (i + 1) % mediaUrls.length);
  const prevPreview = () => setPreviewImageIndex(i => (i - 1 + mediaUrls.length) % mediaUrls.length);

  const previewHashtags = hashtagsStr.split(",").map(t => t.trim()).filter(t => t).map(t => t.startsWith("#") ? t : `#${t}`).join(" ");

  return (
    <div className={styles.container}>
      <Link href="/ads" className={styles.backLink}>← Volver a Anuncios</Link>
      <h2 className={styles.title}>Editar Anuncio: {ad.title}</h2>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {/* LEFT COLUMN: Form Fields */}
          <div className={styles.formSection}>
            {/* Scraper Panel */}
            <div className={`glass-panel`} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 className={styles.sectionTitle}>Importar desde enlace</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "-0.5rem" }}>
                Pega la URL para añadir datos al anuncio.
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input 
                  className={styles.input} 
                  placeholder="https://ejemplo.com/producto" 
                  value={scrapeUrl} 
                  onChange={(e) => setScrapeUrl(e.target.value)} 
                  disabled={scrapingLoading}
                  style={{ flex: 1 }}
                />
                <button 
                  type="button" 
                  className={styles.btnSecondary} 
                  onClick={handleScrapeLink} 
                  disabled={scrapingLoading}
                  style={{ whiteSpace: "nowrap", padding: "0.5rem 1rem" }}
                >
                  {scrapingLoading ? "Extrayendo..." : "🔗 Cargar Contenido"}
                </button>
              </div>
              
              {scrapedImages.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Imágenes detectadas (haz clic para agregar o quitar):</p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", maxHeight: "200px", overflowY: "auto", paddingBottom: "0.25rem" }}>
                    {scrapedImages.map((img, idx) => {
                      const isSelected = mediaUrls.includes(img);
                      return (
                        <img 
                          key={idx} 
                          src={img} 
                          alt={`Scraped ${idx}`} 
                          onClick={() => {
                            if (isSelected) handleRemoveMedia(img);
                            else handleAddMedia(img);
                            setMediaType("image");
                          }}
                          style={{ 
                            width: "72px", height: "72px", objectFit: "cover", borderRadius: "var(--radius-md)", 
                            cursor: "pointer", border: isSelected ? "3px solid var(--accent-primary)" : "2px solid transparent",
                            opacity: isSelected ? 1 : 0.6, flexShrink: 0
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* TRADUCCION CON GOOGLE */}
            <div className={`glass-panel`} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className={styles.sectionTitle} style={{ margin: 0, border: "none", padding: 0 }}>🌍 Traducción de Textos</h3>
                {isTranslating && <span style={{fontSize: "0.8rem", color: "var(--accent-primary)", fontWeight: "bold"}}>⏳ Traduciendo a {isTranslating.toUpperCase()}...</span>}
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "-0.5rem" }}>
                Haz clic en el idioma deseado para traducir automáticamente Título, Descripción y Comentarios.
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
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
                    style={{ 
                      flex: 1, padding: "0.5rem 0", borderRadius: "100px", fontWeight: "bold", fontSize: "0.875rem",
                      background: "rgba(1, 107, 248, 0.1)", color: "var(--accent-blue)", border: "1px solid var(--accent-blue)",
                      cursor: (isTranslating || !title) ? "not-allowed" : "pointer", opacity: (isTranslating && isTranslating !== lang.code) ? 0.5 : 1
                    }}
                  >
                    {lang.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className={`glass-panel`} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 className={styles.sectionTitle}>Información del Anuncio</h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>Campaña</label>
                <input className={styles.input} value={ad.campaign.name} disabled style={{ opacity: 0.7 }} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Título del Anuncio *</label>
                <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Descripción</label>
                <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Enlace de Destino (LinkUrl)</label>
                <input className={styles.input} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              </div>
            </div>

            {/* Campaign Metadata */}
            <div className={`glass-panel`} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 className={styles.sectionTitle}>Metadatos de Campaña</h3>
              <div className={styles.formGroup}>
                <label className={styles.label}>Hashtags</label>
                <input className={styles.input} value={hashtagsStr} onChange={(e) => setHashtagsStr(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Primer Comentario</label>
                <textarea className={styles.textarea} value={firstComment} onChange={(e) => setFirstComment(e.target.value)} rows={3} />
              </div>
            </div>

            {/* Upload */}
            <div className={`glass-panel`} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 className={styles.sectionTitle}>Multimedia * (Agrega 1 o más)</h3>

              {mediaUrls.length > 0 && (
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {mediaUrls.map((url, i) => (
                    <div key={i} className={styles.previewContainer} style={{ width: "120px", position: "relative" }}>
                      {mediaType === "video" && i === 0 ? (
                        <video src={url} style={{ width: "100%", height: "120px", objectFit: "cover" }} />
                      ) : (
                        <img src={url} alt={`Preview ${i}`} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                      )}
                      <button type="button" onClick={() => handleRemoveMedia(url)} style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "12px" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {uploading ? (
                <div className={styles.uploading}>
                  <div className={styles.spinner}></div> Subiendo archivo...
                </div>
              ) : (
                <div
                  className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneDragOver : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input type="file" className={styles.fileInput} accept="image/*,video/*" onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }} />
                  <div className={styles.uploadIcon}>📁</div>
                  <p className={styles.uploadText}>Haz clic o arrastra para añadir más archivos</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Preview */}
          <div className={styles.formSection}>
            <div className={`glass-panel`} style={{ padding: "0 0 1.25rem 0", position: "sticky", top: "90px", overflow: "hidden" }}>
              <div className={styles.previewTabs}>
                <button 
                  type="button" 
                  className={`${styles.previewTab} ${previewTab === "facebook" ? styles.previewTabActive : ""}`} 
                  onClick={() => setPreviewTab("facebook")}
                >
                  <img src="/images/facebook.png" alt="" style={{ width: 16, height: 16, objectFit: "contain" }} /> Facebook
                </button>
                <button 
                  type="button" 
                  className={`${styles.previewTab} ${previewTab === "instagram" ? styles.previewTabActive : ""}`} 
                  onClick={() => setPreviewTab("instagram")}
                >
                  <img src="/images/instagram.png" alt="" style={{ width: 16, height: 16, objectFit: "contain" }} /> Instagram
                </button>
                <button 
                  type="button" 
                  className={`${styles.previewTab} ${previewTab === "youtube" ? styles.previewTabActive : ""}`} 
                  onClick={() => setPreviewTab("youtube")}
                >
                  <img src="/images/youtube.png" alt="" style={{ width: 16, height: 16, objectFit: "contain" }} /> YouTube
                </button>
              </div>

              <div style={{ padding: "1.25rem" }}>
                {!title && !description && !filePreviewUrl ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    Completa los campos para ver la vista previa en tiempo real
                  </div>
                ) : (
                  <>
                    {/* 📘 FACEBOOK MOCKUP */}
                    {previewTab === "facebook" && (
                      <div className={styles.fbPreview}>
                        <div className={styles.fbHeader}>
                          <div className={styles.fbAvatar} />
                          <div className={styles.fbMeta}>
                            <span className={styles.fbName}>Tu Empresa</span>
                            <span className={styles.fbTime}>Justo ahora · 🌍</span>
                          </div>
                        </div>
                        <div className={styles.fbText}>
                          {title && <b>{title}<br/></b>}
                          {description || "Escribe una descripción para tu anuncio..."}
                          {previewHashtags && <div style={{ color: "#1877f2", marginTop: "8px" }}>{previewHashtags.replace(/,/g, " ")}</div>}
                        </div>
                        {filePreviewUrl ? (
                          <div className={styles.fbMedia}>
                            {mediaType === "video" ? (
                              <video src={filePreviewUrl} controls style={{ width: "100%" }} />
                            ) : (
                              <img src={filePreviewUrl} alt="Preview" />
                            )}
                            {/* Image Carousel Controls */}
                            {mediaUrls.length > 1 && (
                              <>
                                <button type="button" onClick={prevPreview} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>◀</button>
                                <button type="button" onClick={nextPreview} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>▶</button>
                                <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.6)", color: "white", padding: "2px 8px", borderRadius: "12px", fontSize: "12px" }}>{previewImageIndex + 1} / {mediaUrls.length}</div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className={styles.fbMedia} style={{ height: "200px", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#65676b" }}>
                            Sin imagen
                          </div>
                        )}
                        <div className={styles.fbActions}>
                          <div className={styles.fbAction}>👍 Me gusta</div>
                          <div className={styles.fbAction}>💬 Comentar</div>
                          <div className={styles.fbAction}>↗️ Compartir</div>
                        </div>
                      </div>
                    )}

                    {/* 📷 INSTAGRAM MOCKUP */}
                    {previewTab === "instagram" && (
                      <div className={styles.igPreview}>
                        <div className={styles.igHeader}>
                          <div className={styles.igAvatar} />
                          <span className={styles.igName}>tu_empresa</span>
                        </div>
                        {filePreviewUrl ? (
                          <div className={styles.igMedia}>
                            {mediaType === "video" ? (
                              <video src={filePreviewUrl} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <img src={filePreviewUrl} alt="Preview" />
                            )}
                            {/* Image Carousel Controls */}
                            {mediaUrls.length > 1 && (
                              <>
                                <button type="button" onClick={prevPreview} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>◀</button>
                                <button type="button" onClick={nextPreview} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>▶</button>
                                <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.6)", color: "white", padding: "2px 8px", borderRadius: "12px", fontSize: "12px" }}>{previewImageIndex + 1} / {mediaUrls.length}</div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className={styles.igMedia} style={{ background: "#efefef", display: "flex", alignItems: "center", justifyContent: "center", color: "#8e8e8e" }}>
                            1080 x 1080
                          </div>
                        )}
                        <div className={styles.igActions}>
                          <span>❤️</span>
                          <span>💬</span>
                          <span>✈️</span>
                        </div>
                        <div className={styles.igLikes}>Les gusta a 1,429 personas</div>
                        <div className={styles.igText}>
                          <b>tu_empresa</b> {title ? `${title} - ${description}` : (description || "Escribe una descripción...")}
                          {previewHashtags && <div style={{ color: "#00376b", marginTop: "4px" }}>{previewHashtags.replace(/,/g, " ")}</div>}
                        </div>
                      </div>
                    )}

                    {/* 🎬 YOUTUBE MOCKUP */}
                    {previewTab === "youtube" && (
                      <div className={styles.ytPreview}>
                        {filePreviewUrl || mediaType === "video" ? (
                          <div className={styles.ytMedia}>
                            {mediaType === "video" ? (
                              <video src={filePreviewUrl || ""} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <img src={filePreviewUrl || ""} alt="Thumbnail preview" />
                            )}
                          </div>
                        ) : (
                          <div className={styles.ytMedia} style={{ background: "#333", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>
                            16:9 Thumbnail
                          </div>
                        )}
                        <div className={styles.ytInfo}>
                          <div className={styles.ytAvatar} />
                          <div className={styles.ytMeta}>
                            <div className={styles.ytTitle}>{title || "Título del video aparecera aquí"}</div>
                            <div className={styles.ytChannel}>Tu Empresa</div>
                            <div className={styles.ytStats}>Enlace Patrocinado • Hace 1 día</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {firstComment && (
                      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-light)", fontSize: "0.85rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <div className={styles.socialPreviewAvatar} style={{ width: "24px", height: "24px", fontSize: "10px", background: "var(--accent-primary)", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center" }}>U</div>
                          <div>
                            <strong>Tu Empresa (Comentario Auto)</strong>
                            <div style={{ color: "var(--text-muted)" }}>{firstComment}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnSecondary} onClick={() => router.push("/ads")}>Cancelar</button>
          <button type="submit" className={styles.btnPrimary} disabled={saving || uploading}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
          <button type="button" className={styles.btnPrimary} style={{ background: "var(--success)" }} onClick={() => router.push(`/ads/${id}/publish`)}>
            Siguiente: Publicar →
          </button>
        </div>
      </form>
    </div>
  );
}
