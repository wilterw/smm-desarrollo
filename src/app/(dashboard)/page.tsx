"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar,
  Cell
} from 'recharts';
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
    destination: string | null;
    socialAccountId: string | null;
    publishedAt: string | null;
    clicks: number;
    reach: number;
    impressions: number;
    ad: { title: string; campaign: { name: string } };
    socialAccount?: { accountName: string | null; pageName: string | null };
  }[];
  socialAccounts: {
    id: string;
    provider: string;
    accountName: string | null;
    pageName: string | null;
  }[];
  stats: {
    clicks: number;
    impressions: number;
    reach: number;
    spend: number;
  };
  budget: {
    totalBudget: number;
    dailyBudget: number;
  };
  chartData: {
    name: string;
    clics: number;
    impresiones: number;
    alcance: number;
    inversion: number;
  }[];
};

export default function DashboardHome() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingRows, setSyncingRows] = useState<Record<string, boolean>>({});
  const [selectedMetric, setSelectedMetric] = useState<"clics" | "alcance" | "impresiones" | "inversion" | null>(null);
  const [filterAccountId, setFilterAccountId] = useState<string>("all");

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

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSyncInsights = async (publicationId?: string) => {
    const url = publicationId 
      ? `/api/social/insights/sync?publicationId=${publicationId}`
      : "/api/social/insights/sync";
    
    if (publicationId) {
      setSyncingRows(prev => ({ ...prev, [publicationId]: true }));
      try {
        const res = await fetch(url);
        if (res.ok) fetchDashboard();
      } finally {
        setSyncingRows(prev => ({ ...prev, [publicationId]: false }));
      }
      return;
    }

    if (!publicationId && data?.recentPublications) {
      setLoading(true);
      for (const pub of data.recentPublications) {
        if (pub.status === "published") {
          await fetch(`/api/social/insights/sync?publicationId=${pub.id}`);
        }
      }
      fetchDashboard();
      setLoading(false);
      return;
    }
  };

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

  const getMaxMetrics = () => {
    if (!data || data.recentPublications.length === 0) return { clicks: 1, reach: 1, impressions: 1 };
    return {
      clicks: Math.max(...data.recentPublications.map(p => p.clicks), 1),
      reach: Math.max(...data.recentPublications.map(p => p.reach), 1),
      impressions: Math.max(...data.recentPublications.map(p => p.impressions), 1)
    };
  };
  const maxMetrics = getMaxMetrics();

  const getPlatformIcon = (platform: string) => {
    if (platform === "facebook") return "📘";
    if (platform === "instagram") return "📷";
    if (platform === "youtube") return "🎬";
    return "🌐";
  };

  return (
    <div className={styles.container}>
      {/* Greeting */}
      <div>
        <div className={styles.greeting}>
          {getGreeting()}, {session?.user?.name || "Usuario"} 👋
        </div>
        <div className={styles.greetingSub}>
          Aquí tienes el resumen de tu cuenta y el rendimiento de tus anuncios.
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select 
              className={styles.accountFilter} 
              value={filterAccountId} 
              onChange={(e) => setFilterAccountId(e.target.value)}
            >
              <option value="all">Todas las cuentas</option>
              {data.socialAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.provider.charAt(0).toUpperCase() + acc.provider.slice(1)}: {acc.accountName || acc.pageName || "Cuenta"}
                </option>
              ))}
            </select>
            <button 
              className={styles.syncBtn} 
              onClick={() => handleSyncInsights()}
              disabled={loading}
            >
              🔄 Sincronizar
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div 
          className={`glass-panel ${styles.kpiCard} ${styles.clickableCard}`}
          onClick={() => router.push("/campaigns")}
        >
          <div className={`${styles.kpiIcon} ${styles.kpiIconBlue}`}>🚀</div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Campañas</span>
            <span className={styles.kpiValue}>{data.counts.campaigns}</span>
          </div>
        </div>
        <div 
          className={`glass-panel ${styles.kpiCard} ${styles.clickableCard}`}
          onClick={() => router.push("/ads")}
        >
          <div className={`${styles.kpiIcon} ${styles.kpiIconPurple}`}>🖼️</div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Anuncios</span>
            <span className={styles.kpiValue}>{data.counts.ads}</span>
          </div>
        </div>
        <div 
          className={`glass-panel ${styles.kpiCard} ${styles.clickableCard}`}
          onClick={() => router.push("/ads")}
        >
          <div className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}>📢</div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Publicaciones</span>
            <span className={styles.kpiValue}>{data.counts.publications}</span>
          </div>
        </div>
        <div 
          className={`glass-panel ${styles.kpiCard} ${styles.clickableCard}`}
          onClick={() => router.push("/settings/accounts")}
        >
          <div className={`${styles.kpiIcon} ${styles.kpiIconOrange}`}>🔗</div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Cuentas Sociales</span>
            <span className={styles.kpiValue}>{data.counts.socialAccounts}</span>
          </div>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className={styles.kpiGrid} style={{ marginTop: "-1rem" }}>
        <div 
          className={`glass-panel ${styles.kpiCard} ${styles.kpiStats} ${styles.clickableCard}`}
          onClick={() => setSelectedMetric("clics")}
        >
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Clics Totales</span>
            <span className={styles.kpiValue}>{data.stats.clicks.toLocaleString()}</span>
          </div>
        </div>
        <div 
          className={`glass-panel ${styles.kpiCard} ${styles.kpiStats} ${styles.clickableCard}`}
          onClick={() => setSelectedMetric("alcance")}
        >
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Alcance (Reach)</span>
            <span className={styles.kpiValue}>{data.stats.reach.toLocaleString()}</span>
          </div>
        </div>
        <div 
          className={`glass-panel ${styles.kpiCard} ${styles.kpiStats} ${styles.clickableCard}`}
          onClick={() => setSelectedMetric("impresiones")}
        >
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Impresiones</span>
            <span className={styles.kpiValue}>{data.stats.impressions.toLocaleString()}</span>
          </div>
        </div>
        <div 
          className={`glass-panel ${styles.kpiCard} ${styles.kpiStats} ${styles.clickableCard}`}
          onClick={() => setSelectedMetric("inversion")}
        >
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Inversión (Ads)</span>
            <span className={styles.kpiValue}>${data.stats.spend.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Analytics Details Modal */}
      {selectedMetric && (
        <div className={styles.modalOverlay} onClick={() => setSelectedMetric(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Detalles de {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedMetric(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalStatsGrid}>
                <div className={styles.modalStatCard}>
                  <div className={styles.modalStatLabel}>Total Acumulado</div>
                  <div className={styles.modalStatValue}>
                    {selectedMetric === "inversion" ? "$" : ""}
                    {data.stats[selectedMetric === "alcance" ? "reach" : selectedMetric === "clics" ? "clicks" : selectedMetric === "impresiones" ? "impressions" : "spend"].toLocaleString()}
                  </div>
                </div>
                <div className={styles.modalStatCard}>
                  <div className={styles.modalStatLabel}>Promedio Diario (7d)</div>
                  <div className={styles.modalStatValue}>
                    {selectedMetric === "inversion" ? "$" : ""}
                    {(data.stats[selectedMetric === "alcance" ? "reach" : selectedMetric === "clics" ? "clicks" : selectedMetric === "impresiones" ? "impressions" : "spend"] / 7).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </div>
                </div>
              </div>

              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  {selectedMetric === "inversion" ? (
                    <BarChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                        itemStyle={{ color: "var(--text-primary)" }}
                      />
                      <Bar dataKey="inversion" name="Inversión ($)">
                        {data.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 6 ? "var(--accent-primary)" : "rgba(183, 6, 6, 0.4)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <AreaChart data={data.chartData}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                        itemStyle={{ color: "var(--text-primary)" }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey={selectedMetric} 
                        name={selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
                        stroke="var(--accent-blue)" 
                        fillOpacity={1} 
                        fill="url(#colorMetric)" 
                        strokeWidth={3}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <th>Plataforma y Título</th>
                <th>Campaña</th>
                <th>Métricas</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPublications
                .filter(pub => filterAccountId === "all" || pub.socialAccountId === filterAccountId)
                .map(pub => {
                  const accName = pub.socialAccount?.accountName || pub.socialAccount?.pageName || "Perfil";
                  return (
                    <tr key={`pub-${pub.id}`}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span className={styles.platformBadge}>{getPlatformIcon(pub.platform)}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{pub.ad.title}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--accent-primary)", opacity: 0.8 }}>
                               @{accName} • {pub.destination}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{pub.ad.campaign.name}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.80rem" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ minWidth: 50 }}>👁️ Imp: <b>{pub.impressions}</b></span>
                            <div className={styles.metricBar}>
                              <div className={`${styles.metricBarFill} ${styles.metricImpressions}`} style={{ width: `${safePercent(pub.impressions, maxMetrics.impressions)}%` }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ minWidth: 50 }}>📈 Alcance: <b>{pub.reach}</b></span>
                            <div className={styles.metricBar}>
                              <div className={`${styles.metricBarFill} ${styles.metricReach}`} style={{ width: `${safePercent(pub.reach, maxMetrics.reach)}%` }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ minWidth: 50 }}>👆 Clics: <b>{pub.clicks}</b></span>
                            <div className={styles.metricBar}>
                              <div className={`${styles.metricBarFill} ${styles.metricClicks}`} style={{ width: `${safePercent(pub.clicks, maxMetrics.clicks)}%` }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className={`${styles.badge} ${getStatusBadge(pub.status)}`}>
                            {pub.status}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{formatDate(pub.publishedAt)}</span>
                        </div>
                      </td>
                      <td>
                        {pub.status === "published" && (
                          <button 
                            className={styles.syncBtnSmall} 
                            onClick={() => handleSyncInsights(pub.id)}
                            disabled={syncingRows[pub.id]}
                            title="Actualizar métricas manualmente"
                          >
                            {syncingRows[pub.id] ? "⏳ Sync..." : "🔄 Sync"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {data.recentAds.map((ad) => (
                <tr key={`ad-${ad.id}`}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className={styles.platformBadge}>
                        {ad.mediaType === "video" ? "🎥" : "🖼️"}
                      </span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{ad.title}</div>
                        <span className={`${styles.typeBadge}`} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                          BORRADOR
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{ad.campaign.name}</td>
                  <td><span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>Pendiente de publicación</span></td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span className={`${styles.badge} ${styles.badgeDraft}`}>Borrador</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{formatDate(ad.createdAt)}</span>
                    </div>
                  </td>
                  <td></td>
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
