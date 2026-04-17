"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./RealEstate.module.css";

type PropertyCatalog = {
  id: string;
  name: string;
  status: string;
  _count?: { properties: number };
  createdAt: string;
  lastSyncAt: string | null;
};

export default function DynamicCampaignsDashboard() {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<PropertyCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/real-estate/catalogs");
      if (res.ok) setCatalogs(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCatalogs(); }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar esta Campaña Dinámica y TODOS sus ítems internos? Esta acción no es reversible.")) return;
    await fetch(`/api/real-estate/catalogs/${id}`, { method: "DELETE" });
    await fetchCatalogs();
  };

  if (loading) return <div className={styles.container}>Cargando Campañas Dinámicas...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Campañas Dinámicas</h1>
          <div className={styles.subtitle}>Catálogos de Inmuebles, Vehículos o Productos Advantage+</div>
        </div>
        <Link href="/real-estate/new" className={styles.addBtn}>
          <span>+</span> Crear Campaña Dinámica
        </Link>
      </div>

      {catalogs.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏢</div>
          <h3 style={{ marginBottom: "0.5rem" }}>No hay Campañas Dinámicas creadas</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Crea tu primer catálogo (Campaña Dinámica) para comenzar a albergar tus inmuebles o productos.
          </p>
          <Link href="/real-estate/new" className={styles.addBtn} style={{ display: "inline-flex", margin: "0 auto" }}>
            Comenzar creación
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {catalogs.map((cat, i) => (
            <div 
              key={cat.id} 
              className={`glass-panel ${styles.catalogCard}`}
              style={{ animationDelay: `${i * 0.1}s` }}
              onClick={() => router.push(`/real-estate/${cat.id}`)}
            >
              <div className={styles.catalogHeader}>
                <h3 className={styles.catalogTitle}>{cat.name}</h3>
                <span className={`${styles.statusBadge} ${styles[`status_${cat.status}`]}`}>
                  {cat.status === "draft" ? "Borrador" : 
                   cat.status === "active" ? "Activo" :
                   cat.status === "syncing" ? "Sincronizando" : "Error"}
                </span>
              </div>
              
              <div style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                <p style={{ marginBottom: "4px" }}>📦 {cat._count?.properties || 0} Elementos internos</p>
                <p>Última Sincronización: {cat.lastSyncAt ? new Date(cat.lastSyncAt).toLocaleDateString() : "Ninguna"}</p>
              </div>

              <div className={styles.cardActions} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                <button 
                  className={`${styles.cardBtn} ${styles.cardBtnPrimary}`} 
                  onClick={(e) => { e.stopPropagation(); router.push(`/real-estate/${cat.id}`); }}
                >
                  Entrar a Campaña →
                </button>
                <button 
                  className={`${styles.cardBtn} ${styles.cardBtnDanger}`} 
                  onClick={(e) => handleDelete(cat.id, e)}
                  style={{ flex: "0 0 auto", padding: "0.4rem 0.6rem" }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
