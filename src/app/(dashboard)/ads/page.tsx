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
                <img src={ad.mediaUrl} alt={ad.title} className={styles.cardMedia} />
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
                  <button className={styles.iconBtn} title="Editar" onClick={() => router.push(`/ads/${ad.id}`)}>✏️ Editar</button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Eliminar" onClick={() => handleDelete(ad.id)}>🗑️ Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
