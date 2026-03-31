"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./CampaignDetail.module.css";
import React from "react";

type Publication = {
  id: string;
  platform: string;
  type: string;
  status: string;
  destination: string;
};

type Ad = {
  id: string;
  title: string;
  mediaType: string;
  mediaUrl: string | null;
  createdAt: string;
  publications: Publication[];
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  ads: Ad[];
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/campaigns/${id}`);
        if (res.ok) {
          setCampaign(await res.json());
        }
      } catch (e) {
        console.error("Error fetching campaign details");
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [id]);

  const getStatusClass = (status: string) => {
    if (status === "published") return styles.bgSuccess;
    if (status === "failed") return styles.bgDanger;
    return styles.bgWarning;
  };

  if (loading) return <div style={{ padding: "2rem" }}>Cargando detalles de campaña...</div>;
  if (!campaign) return <div style={{ padding: "2rem" }}>No se encontró la campaña.</div>;

  return (
    <div className={styles.container}>
      <Link href="/campaigns" className={styles.backLink}>← Volver a Campañas</Link>
      
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>{campaign.name}</h2>
          <span className={`${styles.statusBadge} ${getStatusClass(campaign.status)}`}>{campaign.status}</span>
        </div>
        <button className={styles.addBtn} onClick={() => router.push(`/ads/new?campaignId=${campaign.id}`)}>
          + Añadir Anuncio
        </button>
      </div>

      <div className={`glass-panel ${styles.summaryBox}`}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Fecha Creación</span>
          <strong>{new Date(campaign.createdAt).toLocaleDateString()}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Anuncios</span>
          <strong>{campaign.ads.length}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Publicaciones Activas</span>
          <strong>{campaign.ads.reduce((acc, ad) => acc + ad.publications.filter(p => p.status === "published").length, 0)}</strong>
        </div>
      </div>

      <h3 className={styles.sectionTitle}>Anuncios en esta campaña</h3>
      
      {campaign.ads.length === 0 ? (
        <div className={styles.emptyState}>
          No hay anuncios en esta campaña.
        </div>
      ) : (
        <div className={styles.grid}>
          {campaign.ads.map(ad => (
            <div key={ad.id} className={`glass-panel ${styles.card}`}>
              {ad.mediaUrl && ad.mediaType === "image" && (
                <img src={ad.mediaUrl.split(',')[0]} alt={ad.title} className={styles.adMedia} />
              )}
              {ad.mediaUrl && ad.mediaType === "video" && (
                <video src={ad.mediaUrl} className={styles.cardMediaVideo} muted />
              )}
              {!ad.mediaUrl && (
                <div className={styles.cardMedia} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "var(--text-muted)" }}>🖼️</div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{ad.title}</div>
                <div className={styles.pubsList}>
                  {ad.publications.length === 0 ? (
                    <span className={styles.textMuted}>Sin publicar</span>
                  ) : (
                    ad.publications.map(pub => (
                      <span key={pub.id} className={`${styles.pubBadge} ${pub.status === "published" ? styles.bgSuccess : styles.bgWarning}`}>
                        {pub.platform} {pub.type === "paid" ? "💰" : "📝"}
                      </span>
                    ))
                  )}
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={() => router.push(`/ads/${ad.id}`)}>✏️ Editar</button>
                  <button className={`${styles.iconBtn} ${styles.btnPrimary}`} onClick={() => router.push(`/ads/${ad.id}/publish`)}>🚀 Publicar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
