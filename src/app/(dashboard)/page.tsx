"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import styles from "./Dashboard.module.css";

type DashboardData = {
  counts: {
    campaigns: number;
    ads: number;
    publications: number;
    socialAccounts: number;
  };
  campaignStatuses: Record<string, number>;
  publicationStatuses: Record<string, number>;
  platformDistribution: Record<string, number>;
  recentAds: {
    id: string;
    title: string;
    mediaType: string;
    createdAt: string;
    campaign: { name: string };
  }[];
  recentPublications: {
    id: string;
    platform: string;
    type: string;
    status: string;
    publishedAt: string | null;
    ad: { title: string; campaign: { name: string } };
  }[];
  budget: {
    totalBudget: number;
    dailyBudget: number;
  };
};

export default function DashboardHome() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          setData(await res.json());
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        Cargando dashboard...
      </div>
    );
  }

  if (!data) return <div>Error al cargar datos</div>;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published": return styles.badgePublished;
      case "pending": return styles.badgePending;
      case "failed": return styles.badgeFailed;
      default: return styles.badgeDraft;
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
  };

  const safePercent = (value: number, total: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className={styles.container}>
      {/* Greeting */}
      <div>
        <div className={styles.greeting}>
          {getGreeting()}, {session?.user?.name || "Usuario"} 👋
        </div>
        <div className={styles.greetingSub}>
          Aquí tienes el resumen de tu cuenta.
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={`glass-panel ${styles.kpiCard}`}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconBlue}`}>🚀</div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Campañas</span>
            <span className={styles.kpiValue}>{data.counts.campaigns}</span>
          </div>
        </div>
        <div className={`glass-panel ${styles.kpiCard}`}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconPurple}`}>🖼️</div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Anuncios</span>
            <span className={styles.kpiValue}>{data.counts.ads}</span>
          </div>
        </div>
        <div className={`glass-panel ${styles.kpiCard}`}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}>📢</div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Publicaciones</span>
            <span className={styles.kpiValue}>{data.counts.publications}</span>
          </div>
        </div>
        <div className={`glass-panel ${styles.kpiCard}`}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconOrange}`}>🔗</div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Cuentas Sociales</span>
            <span className={styles.kpiValue}>{data.counts.socialAccounts}</span>
          </div>
        </div>
      </div>

      {/* Status Section */}
      <div className={styles.statusGrid}>
        {/* Campaign statuses */}
        <div className={`glass-panel ${styles.statusCard}`}>
          <div className={styles.statusTitle}>Estado de Campañas</div>

          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>✅ Publicadas</span>
            <span className={styles.statusCount}>{data.campaignStatuses.published || 0}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${styles.progressSuccess}`}
              style={{ width: `${safePercent(data.campaignStatuses.published || 0, data.counts.campaigns)}%` }}
            />
          </div>

          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>📝 Borradores</span>
            <span className={styles.statusCount}>{data.campaignStatuses.draft || 0}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${styles.progressWarning}`}
              style={{ width: `${safePercent(data.campaignStatuses.draft || 0, data.counts.campaigns)}%` }}
            />
          </div>

          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>❌ Fallidas</span>
            <span className={styles.statusCount}>{data.campaignStatuses.failed || 0}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${styles.progressDanger}`}
              style={{ width: `${safePercent(data.campaignStatuses.failed || 0, data.counts.campaigns)}%` }}
            />
          </div>
        </div>

        {/* Publication statuses */}
        <div className={`glass-panel ${styles.statusCard}`}>
          <div className={styles.statusTitle}>Estado de Publicaciones</div>

          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>✅ Publicadas</span>
            <span className={styles.statusCount}>{data.publicationStatuses.published || 0}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${styles.progressSuccess}`}
              style={{ width: `${safePercent(data.publicationStatuses.published || 0, data.counts.publications)}%` }}
            />
          </div>

          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>⏳ Pendientes</span>
            <span className={styles.statusCount}>{data.publicationStatuses.pending || 0}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${styles.progressBlue}`}
              style={{ width: `${safePercent(data.publicationStatuses.pending || 0, data.counts.publications)}%` }}
            />
          </div>

          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>❌ Fallidas</span>
            <span className={styles.statusCount}>{data.publicationStatuses.failed || 0}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${styles.progressDanger}`}
              style={{ width: `${safePercent(data.publicationStatuses.failed || 0, data.counts.publications)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Platform Distribution */}
      <div>
        <div className={styles.sectionTitle}>Distribución por Plataforma</div>
        <div className={styles.platformGrid}>
          <div className={`glass-panel ${styles.platformCard}`}>
            <div className={styles.platformIcon}>📘</div>
            <div className={styles.platformName}>Facebook</div>
            <div className={`${styles.platformCount} ${styles.platformFb}`}>
              {data.platformDistribution.facebook || 0}
            </div>
          </div>
          <div className={`glass-panel ${styles.platformCard}`}>
            <div className={styles.platformIcon}>📷</div>
            <div className={styles.platformName}>Instagram</div>
            <div className={`${styles.platformCount} ${styles.platformIg}`}>
              {data.platformDistribution.instagram || 0}
            </div>
          </div>
          <div className={`glass-panel ${styles.platformCard}`}>
            <div className={styles.platformIcon}>🎬</div>
            <div className={styles.platformName}>YouTube</div>
            <div className={`${styles.platformCount} ${styles.platformYt}`}>
              {data.platformDistribution.youtube || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Activity + Budget + Quick Actions */}
      <div className={styles.bottomGrid}>
        {/* Recent Activity */}
        <div className={`glass-panel ${styles.activityCard}`}>
          <div className={styles.sectionTitle}>Actividad Reciente</div>
          <table className={styles.activityTable}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Título</th>
                <th>Campaña</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {data.recentAds.length === 0 && data.recentPublications.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    No hay actividad reciente
                  </td>
                </tr>
              )}
              {data.recentPublications.map((pub) => (
                <tr key={`pub-${pub.id}`}>
                  <td>📢 Publicación</td>
                  <td>{pub.ad.title}</td>
                  <td>{pub.ad.campaign.name}</td>
                  <td>
                    <span className={`${styles.badge} ${getStatusBadge(pub.status)}`}>
                      {pub.status}
                    </span>
                  </td>
                  <td>{formatDate(pub.publishedAt)}</td>
                </tr>
              ))}
              {data.recentAds.map((ad) => (
                <tr key={`ad-${ad.id}`}>
                  <td>🖼️ Anuncio</td>
                  <td>{ad.title}</td>
                  <td>{ad.campaign.name}</td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeDraft}`}>
                      {ad.mediaType}
                    </span>
                  </td>
                  <td>{formatDate(ad.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Actions + Budget */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className={`glass-panel ${styles.quickActions}`}>
            <div className={styles.sectionTitle}>Acciones Rápidas</div>
            <Link href="/campaigns" className={styles.quickBtn}>
              <span className={styles.quickBtnIcon}>🚀</span>
              Nueva Campaña
            </Link>
            <Link href="/ads/new" className={styles.quickBtn}>
              <span className={styles.quickBtnIcon}>🖼️</span>
              Crear Anuncio
            </Link>
            <Link href="/settings/accounts" className={styles.quickBtn}>
              <span className={styles.quickBtnIcon}>🔗</span>
              Conectar Red Social
            </Link>
          </div>

          {/* Budget Summary */}
          {(data.budget.totalBudget > 0 || data.budget.dailyBudget > 0) && (
            <div className={`glass-panel ${styles.budgetCard}`}>
              <div className={styles.sectionTitle}>💰 Presupuesto</div>
              <div className={styles.budgetRow}>
                <span className={styles.budgetLabel}>Total</span>
                <span className={styles.budgetValue}>
                  ${data.budget.totalBudget.toLocaleString("es")}
                </span>
              </div>
              <div className={styles.budgetRow}>
                <span className={styles.budgetLabel}>Diario</span>
                <span className={styles.budgetValue}>
                  ${data.budget.dailyBudget.toLocaleString("es")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
