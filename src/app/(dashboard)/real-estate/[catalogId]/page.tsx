"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../RealEstate.module.css";
import React from "react";

type Property = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  images: string | null;
  availability: string;
  propertyType: string;
  city: string;
  listingUrl: string | null;
  syncStatus: string;
  createdAt: string;
  catalog: { name: string; metaCatalogId: string | null; id: string };
};

function InternalCatalogView({ catalogId }: { catalogId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";
  
  const [items, setItems] = useState<Property[]>([]);
  const [filter, setFilter] = useState(initialFilter);
  const [loading, setLoading] = useState(true);
  const [viewingItem, setViewingItem] = useState<Property | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [catalogName, setCatalogName] = useState("");

  useEffect(() => {
    setFilter(searchParams.get("filter") || "all");
  }, [searchParams]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/real-estate/properties`);
      if (res.ok) {
        const allProps: Property[] = await res.json();
        // Filtrar solo los del catálogo actual
        const catProps = allProps.filter(p => p.catalog.id === catalogId);
        setItems(catProps);
        if (catProps.length > 0) {
          setCatalogName(catProps[0].catalog.name);
        } else {
          // Si está vacío, traemos el nombre del catálogo de otra forma si es necesario
          const catRes = await fetch(`/api/real-estate/catalogs/${catalogId}`);
          if (catRes.ok) {
            const cat = await catRes.json();
            setCatalogName(cat.name);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [catalogId]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este ítem?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/real-estate/properties?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems(prev => prev.filter(p => p.id !== id));
        setViewingItem(null);
      } else {
        alert("Error al eliminar el ítem");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setDeleting(null);
    }
  };

  const handleSync = async (item: Property) => {
    setSyncing(item.id);
    try {
      const res = await fetch(`/api/real-estate/catalogs/${item.catalog.id}/sync`, { method: "POST" });
      if (res.ok) {
         alert("Sincronización enviada a Meta con éxito");
         fetchItems();
      } else {
         const data = await res.json();
         alert("Error: " + data.error);
      }
    } catch {
      alert("Error de conexión al sincronizar");
    } finally {
      setSyncing(null);
    }
  };

  if (loading) return <div className={styles.container}>Cargando campaña dinámica...</div>;

  const filteredItems = items.filter(item => {
    if (filter === "for_sale") return item.availability === "for_sale";
    if (filter === "for_rent") return item.availability === "for_rent";
    if (filter === "drafts") return item.syncStatus === "pending" || item.syncStatus === "error";
    return true; // "all"
  });

  return (
    <div className={styles.container}>
      <Link href="/real-estate" className={styles.backBtn} style={{ marginBottom: "0.5rem" }}>
        ← Volver a Campañas Dinámicas
      </Link>
      
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{catalogName || "Campaña Dinámica"}</h2>
          <div className={styles.subtitle}>Listado interno de ítems de la campaña</div>
        </div>
        <Link href={`/real-estate/new?catalogId=${catalogId}`} className={styles.addBtn}>
          <span>+</span> Añadir Ítem
        </Link>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${filter === "for_sale" ? styles.activeTab : ""}`}
          onClick={() => router.push(`/real-estate/${catalogId}?filter=for_sale`)}
        >
          🏠 En Venta
        </button>
        <button 
          className={`${styles.tab} ${filter === "for_rent" ? styles.activeTab : ""}`}
          onClick={() => router.push(`/real-estate/${catalogId}?filter=for_rent`)}
        >
          🔑 En Alquiler
        </button>
        <button 
          className={`${styles.tab} ${filter === "drafts" ? styles.activeTab : ""}`}
          onClick={() => router.push(`/real-estate/${catalogId}?filter=drafts`)}
        >
          📝 Pendientes / Borradores
        </button>
        <button 
          className={`${styles.tab} ${filter === "all" ? styles.activeTab : ""}`}
          onClick={() => router.push(`/real-estate/${catalogId}?filter=all`)}
        >
          📢 Todos
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className={`glass-panel ${styles.empty}`}>
          <div className={styles.emptyIcon}>🔍</div>
          <p>Esta Campaña Dinámica aún no tiene ítems en esta categoría.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              className={`glass-panel ${styles.card}`}
              onClick={() => { setViewingItem(item); setViewingIndex(0); }}
            >
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.name} className={styles.cardMedia} />
              )}
              {!item.imageUrl && (
                <div className={styles.cardMedia} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "var(--text-muted)" }}>🖼️</div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{item.name}</div>
                <div className={styles.cardPrice}>{item.price.toLocaleString()} {item.currency}</div>
                <div className={styles.cardMeta}>
                  <span>📍 {item.city}</span>
                  <span className={styles.mediaBadge}>{item.availability === "for_rent" ? "Alquiler" : "Venta"}</span>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={(e) => { e.stopPropagation(); setViewingItem(item); setViewingIndex(0); }}>👁️ Ver</button>
                  <button className={styles.iconBtn} onClick={(e) => { e.stopPropagation(); router.push(`/real-estate/${catalogId}/${item.id}/edit`); }}>✏️ Editar</button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnPublish}`} onClick={(e) => { e.stopPropagation(); router.push(`/real-estate/${catalogId}/${item.id}/publish`); }}>
                    🚀 Publicar
                  </button>
                  <button 
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`} 
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    disabled={deleting === item.id}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal Oscuro (Estilo Anuncios) */}
      {viewingItem && (
        <div className={styles.modalOverlay} onClick={() => setViewingItem(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setViewingItem(null)}>✕</button>

            {viewingItem.imageUrl && (() => {
              const allImages = [viewingItem.imageUrl];
              if (viewingItem.images) {
                 try { const extras = JSON.parse(viewingItem.images); allImages.push(...extras); } catch(e) {}
              }
              const currentUrl = allImages[viewingIndex] || allImages[0];
              const next = (e: React.MouseEvent) => { e.stopPropagation(); setViewingIndex((i) => (i + 1) % allImages.length); };
              const prev = (e: React.MouseEvent) => { e.stopPropagation(); setViewingIndex((i) => (i - 1 + allImages.length) % allImages.length); };
              return (
                <div style={{ position: "relative" }}>
                  <img src={currentUrl} alt={viewingItem.name} className={styles.modalMedia} />
                  {allImages.length > 1 && (
                    <>
                      <button type="button" onClick={prev} className={styles.carouselBtn} style={{ left: 10 }}>◀</button>
                      <button type="button" onClick={next} className={styles.carouselBtn} style={{ right: 10 }}>▶</button>
                      <div className={styles.carouselDots}>
                        {allImages.map((_: any, i: number) => (
                          <div key={i} className={`${styles.carouselDot} ${i === viewingIndex ? styles.carouselDotActive : ""}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            
            {!viewingItem.imageUrl && (
              <div className={styles.modalMediaPlaceholder}>🖼️</div>
            )}

            <div className={styles.modalBody}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h3 className={styles.modalTitle}>{viewingItem.name}</h3>
                <span className={styles.cardPrice} style={{ fontSize: "1.3rem" }}>
                  {viewingItem.price.toLocaleString()} {viewingItem.currency}
                </span>
              </div>
              
              {viewingItem.description && <p className={styles.modalDesc}>{viewingItem.description}</p>}
              
              {viewingItem.listingUrl && (
                <a href={viewingItem.listingUrl} target="_blank" rel="noopener noreferrer" className={styles.modalLink}>
                  🔗 {viewingItem.listingUrl}
                </a>
              )}
              <div className={styles.modalMeta}>
                <span>📁 {viewingItem.catalog.name}</span>
                <span>📍 {viewingItem.city}</span>
                <span className={styles.mediaBadge}>{viewingItem.propertyType}</span>
                <span>📅 {new Date(viewingItem.createdAt).toLocaleDateString()}</span>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.modalBtn} onClick={() => router.push(`/real-estate/${catalogId}/${viewingItem.id}/edit`)}>
                  ✏️ Editar
                </button>
                <button className={styles.modalBtn} style={{ borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }} onClick={() => router.push(`/real-estate/${catalogId}/${viewingItem.id}/publish`)}>
                  🚀 Publicar & Sync Meta
                </button>
                <button 
                  className={`${styles.modalBtn} ${styles.modalBtnDanger}`} 
                  onClick={() => handleDelete(viewingItem.id)}
                  disabled={deleting === viewingItem.id}
                >
                  {deleting === viewingItem.id ? "Eliminando..." : "🗑️ Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InternalCatalogPage({ params }: { params: Promise<{ catalogId: string }> }) {
  const { catalogId } = React.use(params);
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Cargando...</div>}>
      <InternalCatalogView catalogId={catalogId} />
    </Suspense>
  );
}
