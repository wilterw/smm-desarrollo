"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Campaigns.module.css";

type Campaign = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  ads: any[];
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) setCampaigns(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setNewName("");
        setModalOpen(false);
        await fetchCampaigns();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta campaña y todos sus anuncios?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    await fetchCampaigns();
  };

  const getStatusClass = (status: string) => {
    if (status === "published") return styles.statusPublished;
    if (status === "failed") return styles.statusFailed;
    return styles.statusDraft;
  };

  if (loading) return <div>Cargando campañas...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Mis Campañas</h2>
        <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
          <span>+</span> Nueva Campaña
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className={`glass-panel ${styles.empty}`}>
          <div className={styles.emptyIcon}>🚀</div>
          <p>Aún no tienes campañas. ¡Crea la primera!</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {campaigns.map(c => (
            <div key={c.id} className={`glass-panel ${styles.card}`} onClick={() => router.push(`/campaigns/${c.id}`)}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>{c.name}</span>
                <span className={`${styles.statusBadge} ${getStatusClass(c.status)}`}>{c.status}</span>
              </div>
              <div className={styles.cardMeta}>
                <span>📢 {c.ads.length} anuncio{c.ads.length !== 1 ? "s" : ""}</span>
                <span>📅 {new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <div className={styles.cardActions}>
                <button className={`${styles.cardBtn} ${styles.cardBtnPrimary}`} onClick={(e) => { e.stopPropagation(); router.push(`/ads/new?campaignId=${c.id}`); }}>
                  + Añadir Anuncio
                </button>
                <button className={`${styles.cardBtn} ${styles.cardBtnDanger}`} onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Crear Nueva Campaña</h3>
            <form onSubmit={handleCreate}>
              <input className={styles.input} placeholder="Nombre de la campaña" value={newName} onChange={(e) => setNewName(e.target.value)} required autoFocus />
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.submitBtn} disabled={saving}>{saving ? "Creando..." : "Crear"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
