"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./Ads.module.css";

type Ad = {
  id: string;
  title: string;
  description: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  createdAt: string;
  campaign: { name: string };
};

export default function AdsPage() {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingAd, setViewingAd] = useState<Ad | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);

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
    if (!confirm("¿Eliminar este anuncio?")) return;
    await fetch(`/api/ads/${id}`, { method: "DELETE" });
    await fetchAds();
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
            <div key={ad.id} className={`glass-panel ${styles.card}`}>
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
                  <button className={styles.iconBtn} title="Ver" onClick={() => { setViewingAd(ad); setViewingIndex(0); }}>👁️ Ver</button>
                  <button className={styles.iconBtn} title="Editar" onClick={() => router.push(`/ads/${ad.id}`)}>✏️ Editar</button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Eliminar" onClick={() => handleDelete(ad.id)}>🗑️ Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingAd && (
        <div className={styles.modalOverlay} onClick={() => setViewingAd(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Vista Previa del Anuncio</h3>
              <button className={styles.modalClose} onClick={() => setViewingAd(null)}>✕</button>
            </div>
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
                      <button type="button" onClick={prev} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>◀</button>
                      <button type="button" onClick={next} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>▶</button>
                      <div style={{ position: "absolute", bottom: 15, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8 }}>
                        {urls.map((_: any, i: number) => (
                          <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i === viewingIndex ? "var(--accent-primary)" : "rgba(255,255,255,0.6)", transition: "all 0.2s" }} />
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
            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>{viewingAd.title}</h3>
              {viewingAd.description && <p className={styles.modalDesc}>{viewingAd.description}</p>}
              <div className={styles.modalMeta}>
                <span>📁 {viewingAd.campaign.name}</span>
                <span className={styles.mediaBadge}>{viewingAd.mediaType}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
