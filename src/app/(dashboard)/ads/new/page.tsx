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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Form state
  const [campaignId, setCampaignId] = useState(preselectedCampaignId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  
  // New campaign metadata state
  const [hashtagsStr, setHashtagsStr] = useState("");
  const [firstComment, setFirstComment] = useState("");

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

  const handleFileChange = async (file: File) => {
    setMediaFile(file);
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
    
    // Upload immediately
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setMediaUrl(data.url);
        setMediaType(data.mediaType);
      } else {
        alert("Error subiendo archivo");
        setMediaFile(null);
      }
    } catch {
      alert("Error de conexión al subir archivo");
      setMediaFile(null);
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
    if (!campaignId || !title || !mediaUrl) {
      alert("Completa todos los campos obligatorios y sube un archivo multimedia.");
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

  const filePreviewUrl = mediaFile ? URL.createObjectURL(mediaFile) : null;
  
  // Format hashtags for preview
  const previewHashtags = hashtagsStr.split(",").map(t => t.trim()).filter(t => t).map(t => t.startsWith("#") ? t : `#${t}`).join(" ");

  return (
    <div className={styles.container}>
      <Link href="/campaigns" className={styles.backLink}>← Volver a Campañas</Link>
      <h2 className={styles.title}>Crear Nuevo Anuncio</h2>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {/* LEFT COLUMN: Form Fields */}
          <div className={styles.formSection}>
            <div className={`glass-panel`} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 className={styles.sectionTitle}>Información del Anuncio</h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>Campaña *</label>
                <select className={styles.select} value={campaignId} onChange={(e) => setCampaignId(e.target.value)} required>
                  <option value="">Seleccionar campaña</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Título del Anuncio *</label>
                <input className={styles.input} placeholder="Ej: Promoción de verano 2026" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Descripción</label>
                <textarea className={styles.textarea} placeholder="Describe tu anuncio para las redes sociales..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            {/* Campaign Metadata */}
            <div className={`glass-panel`} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 className={styles.sectionTitle}>Metadatos de Campaña</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "-0.5rem", marginBottom: "0.5rem" }}>
                Estos valores se aplicarán a todas las publicaciones de esta campaña.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Hashtags (separados por coma)</label>
                <input className={styles.input} placeholder="Ej: marketing, ventas, smm" value={hashtagsStr} onChange={(e) => setHashtagsStr(e.target.value)} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Automático: Primer Comentario</label>
                <textarea className={styles.textarea} placeholder="Escribe el comentario que se publicará automáticamente después de subir el post..." value={firstComment} onChange={(e) => setFirstComment(e.target.value)} rows={3} />
              </div>
            </div>

            {/* Upload */}
            <div className={`glass-panel`} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 className={styles.sectionTitle}>Multimedia *</h3>

              {mediaUrl && filePreviewUrl ? (
                <div className={styles.previewContainer}>
                  {mediaType === "video" ? (
                    <video src={filePreviewUrl} className={styles.previewVideo} controls />
                  ) : (
                    <img src={filePreviewUrl} alt="Preview" className={styles.previewImage} />
                  )}
                  <button type="button" className={styles.removeFile} onClick={() => { setMediaUrl(""); setMediaFile(null); }}>✕ Quitar</button>
                </div>
              ) : uploading ? (
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
                  <p className={styles.uploadText}>
                    Arrastra una imagen o video aquí, o <span className={styles.uploadTextAccent}>haz clic para seleccionar</span>
                  </p>
                  <p className={styles.uploadText} style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
                    JPG, PNG, GIF, WEBP, MP4, WEBM
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Preview */}
          <div className={styles.formSection}>
            <div className={`glass-panel`} style={{ padding: "1.25rem", position: "sticky", top: "90px" }}>
              <h3 className={styles.sectionTitle} style={{ marginBottom: "1rem" }}>Vista Previa Estándar</h3>
              <div className={styles.socialPreview}>
                <div className={styles.socialPreviewHeader}>
                  <div className={styles.socialPreviewAvatar}>U</div>
                  <div>
                    <div className={styles.socialPreviewName}>Tu Empresa</div>
                    <div className={styles.socialPreviewTime}>Ahora · 🌐</div>
                  </div>
                </div>
                {(title || description || previewHashtags) && (
                  <div className={styles.socialPreviewText}>
                    {title && <strong>{title}</strong>}
                    {title && description && <br />}
                    {description}
                    {previewHashtags && (
                      <div style={{ color: "var(--accent-blue)", marginTop: "0.5rem" }}>{previewHashtags}</div>
                    )}
                  </div>
                )}
                {filePreviewUrl && (
                  <div className={styles.socialPreviewMedia}>
                    {mediaType === "video" ? (
                      <video src={filePreviewUrl} controls style={{ width: "100%" }} />
                    ) : (
                      <img src={filePreviewUrl} alt="Preview" style={{ width: "100%" }} />
                    )}
                  </div>
                )}
                
                {firstComment && (
                  <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-light)", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div className={styles.socialPreviewAvatar} style={{ width: "24px", height: "24px", fontSize: "10px" }}>U</div>
                      <div>
                        <strong>Tu Empresa</strong>
                        <div style={{ color: "var(--text-muted)" }}>{firstComment}</div>
                      </div>
                    </div>
                  </div>
                )}

                {!title && !description && !filePreviewUrl && (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    Completa los campos para ver la vista previa en tiempo real
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnSecondary} onClick={() => router.push("/campaigns")}>Cancelar</button>
          <button type="submit" className={styles.btnPrimary} style={{ paddingLeft: "2rem", paddingRight: "2rem" }} disabled={saving || uploading}>
            {saving ? "Guardando..." : "Crear y Continuar a Publicar →"}
          </button>
        </div>
      </form>
    </div>
  );
}
