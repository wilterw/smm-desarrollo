"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./Ads.module.css";
import React from "react";

type Ad = {
  id: string;
  title: string;
  description: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  linkUrl?: string;
  createdAt: string;
  campaign: { name: string };
};

export default function AdsPage() {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingAd, setViewingAd] = useState<Ad | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ads");
      if (res.ok) setAds(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAds(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este anuncio? Esta acción no se puede deshacer.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/ads/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAds(prev => prev.filter(a => a.id !== id));
        setViewingAd(null);
      } else {
        alert("Error al eliminar el anuncio");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div>Cargando anuncios...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Mis Anuncios</h2>
        <Link href="/ads/new" className={styles.addBtn}>
          <span>+</span> Crear Anuncio
        </Link>
      </div>

      {ads.length === 0 ? (
        <div className={`glass-panel ${styles.empty}`}>
          <div className={styles.emptyIcon}>🖼️</div>
          <p>No tienes anuncios aún. ¡Crea el primero!</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {ads.map(ad => (
            <div 
              key={ad.id} 
              className={`glass-panel ${styles.card}`}
              onClick={() => { setViewingAd(ad); setViewingIndex(0); }}
            >
              {ad.mediaUrl && ad.mediaType === "image" && (
                <img src={ad.mediaUrl.split(',')[0]} alt={ad.title} className={styles.cardMedia} />
              )}
              {ad.mediaUrl && ad.mediaType === "video" && (
                <video src={ad.mediaUrl} className={styles.cardMediaVideo} muted />
              )}
              {!ad.mediaUrl && (
                <div className={styles.cardMedia} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "var(--text-muted)" }}>🖼️</div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{ad.title}</div>
                {ad.description && <div className={styles.cardDesc}>{ad.description}</div>}
                <div className={styles.cardMeta}>
                  <span>📁 {ad.campaign.name}</span>
                  <span className={styles.mediaBadge}>{ad.mediaType}</span>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={(e) => { e.stopPropagation(); setViewingAd(ad); setViewingIndex(0); }}>👁️ Ver</button>
                  <button className={styles.iconBtn} onClick={(e) => { e.stopPropagation(); router.push(`/ads/${ad.id}`); }}>✏️ Editar</button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnPublish}`} onClick={(e) => { e.stopPropagation(); router.push(`/ads/${ad.id}/publish`); }}>🚀 Publicar</button>
                  <button 
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`} 
                    onClick={(e) => { e.stopPropagation(); handleDelete(ad.id); }}
                    disabled={deleting === ad.id}
                  >
                    {deleting === ad.id ? "..." : "🗑️"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {viewingAd && (
        <div className={styles.modalOverlay} onClick={() => setViewingAd(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setViewingAd(null)}>✕</button>

            {viewingAd.mediaUrl && viewingAd.mediaType === "image" && (() => {
              const urls = viewingAd.mediaUrl.split(',');
              const currentUrl = urls[viewingIndex] || urls[0];
              const next = (e: React.MouseEvent) => { e.stopPropagation(); setViewingIndex((i) => (i + 1) % urls.length); };
              const prev = (e: React.MouseEvent) => { e.stopPropagation(); setViewingIndex((i) => (i - 1 + urls.length) % urls.length); };
              return (
                <div style={{ position: "relative" }}>
                  <img src={currentUrl} alt={viewingAd.title} className={styles.modalMedia} />
                  {urls.length > 1 && (
                    <>
                      <button type="button" onClick={prev} className={styles.carouselBtn} style={{ left: 10 }}>◀</button>
                      <button type="button" onClick={next} className={styles.carouselBtn} style={{ right: 10 }}>▶</button>
                      <div className={styles.carouselDots}>
                        {urls.map((_: any, i: number) => (
                          <div key={i} className={`${styles.carouselDot} ${i === viewingIndex ? styles.carouselDotActive : ""}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            {viewingAd.mediaUrl && viewingAd.mediaType === "video" && (
              <video src={viewingAd.mediaUrl} controls className={styles.modalMedia} style={{width: "100%"}} />
            )}
            {!viewingAd.mediaUrl && (
              <div className={styles.modalMediaPlaceholder}>🖼️</div>
            )}

            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>{viewingAd.title}</h3>
              {viewingAd.description && <p className={styles.modalDesc}>{viewingAd.description}</p>}
              {viewingAd.linkUrl && (
                <a href={viewingAd.linkUrl} target="_blank" rel="noopener noreferrer" className={styles.modalLink}>
                  🔗 {viewingAd.linkUrl}
                </a>
              )}
              <div className={styles.modalMeta}>
                <span>📁 {viewingAd.campaign.name}</span>
                <span className={styles.mediaBadge}>{viewingAd.mediaType}</span>
                <span>📅 {new Date(viewingAd.createdAt).toLocaleDateString()}</span>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.modalBtn} onClick={() => { setViewingAd(null); router.push(`/ads/${viewingAd.id}`); }}>
                  ✏️ Editar
                </button>
                <button className={styles.modalBtn} onClick={() => { setViewingAd(null); router.push(`/ads/${viewingAd.id}/publish`); }}>
                  🚀 Publicar
                </button>
                <button 
                  className={`${styles.modalBtn} ${styles.modalBtnDanger}`} 
                  onClick={() => handleDelete(viewingAd.id)}
                  disabled={deleting === viewingAd.id}
                >
                  {deleting === viewingAd.id ? "Eliminando..." : "🗑️ Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
