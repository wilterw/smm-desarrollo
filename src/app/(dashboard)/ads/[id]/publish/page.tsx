"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./Publish.module.css";

type AdsConfig = {
  campaignObjective: string;
  country: string;
  state: string;
  city: string;
  radiusKm: number;
  ageMin: number;
  ageMax: number;
  gender: string;
  languages: string[];
  maritalStatus: string;
  education: string;
  interests: string[];
  behaviors: string[];
  placements: string;
  budgetType: "daily" | "total";
  budgetAmount: number;
  bidStrategy: string;
  startDate: string;
  endDate: string;
};

type Destination = "feed" | "fanpage" | "both" | "reels" | "stories" | "shorts" | "ads";

export default function PublishWizard({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [ad, setAd] = useState<any>(null);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [platform, setPlatform] = useState<"facebook" | "instagram" | "youtube" | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [adsConfig, setAdsConfig] = useState<AdsConfig>({
    campaignObjective: "engagement",
    country: "US",
    state: "",
    city: "",
    radiusKm: 20,
    ageMin: 18,
    ageMax: 65,
    gender: "all",
    languages: [],
    maritalStatus: "all",
    education: "all",
    interests: [],
    behaviors: [],
    placements: "auto",
    budgetType: "daily",
    budgetAmount: 10,
    bidStrategy: "lowest_cost",
    startDate: new Date().toISOString().split('T')[0],
    endDate: ""
  });

  const [openSections, setOpenSections] = useState({
    objective: true,
    location: false,
    demographics: false,
    interests: false,
    placements: false,
    budget: false
  });
  
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ads").then(r => r.json()).then(ads => {
      const found = ads.find((a: any) => a.id === resolvedParams.id);
      if (found) setAd(found);
    });
    fetch("/api/social/accounts").then(r => r.json()).then(setSocialAccounts);
  }, [resolvedParams.id]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleArrayItem = (field: "interests" | "behaviors" | "languages", value: string) => {
    setAdsConfig(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(i => i !== value) : [...arr, value] };
    });
  };

  const getAudienceEstimate = () => {
    let score = 50;
    if (adsConfig.interests.length > 0) score -= adsConfig.interests.length * 5;
    if (selectedAccountIds.length > 1) score += 20;
    return Math.max(10, Math.min(90, score));
  };

  const toggleAccountSelection = (accountId: string, accountPlatform: any) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        setPlatform(accountPlatform);
        return [...prev, accountId];
      }
    });
  };

  const handleConnect = async (p: string) => {
    try {
      const res = await fetch(`/api/social/connect?provider=${p}`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "Conectar", "width=600,height=700");
      }
    } catch (e) {
      setError("Error al conectar");
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedAccountIds.length === 0) return setError("Selecciona al menos una cuenta");
    if (step === 2 && !destination) return setError("Selecciona un destino");
    setError(null);
    setStep(s => s + 1);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishResults(null);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adId: ad.id,
          destinations: selectedAccountIds.map(accountId => {
            const acc = socialAccounts.find(a => a.id === accountId);
            return {
              platform: acc.provider,
              socialAccountId: acc.id,
              destination,
              adsConfig: destination === "ads" ? { ...adsConfig, linkUrl: ad.linkUrl } : null
            };
          })
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setPublishResults(data.results || []);
      } else {
        setError(data.error || "Error al publicar");
      }
    } catch (e) {
      setError("Error crítico en el servidor.");
    } finally {
      setPublishing(false);
    }
  };

  const renderDestinations = () => {
    let options: { id: Destination, name: string, icon: string, desc: string }[] = [];
    if (platform === "facebook") {
      options = [
        { id: "feed", name: "Muro Personal", icon: "👤", desc: "Tu perfil personal" },
        { id: "fanpage", name: "Fanpage", icon: "🚩", desc: "Muro de la Página" },
        { id: "ads", name: "Facebook Ads", icon: "📈", desc: "Anuncio de pago" }
      ];
    } else if (platform === "instagram") {
      options = [
        { id: "feed", name: "Feed", icon: "📸", desc: "Post estándar" },
        { id: "reels", name: "Reels", icon: "🎬", desc: "Video vertical" },
        { id: "ads", name: "Instagram Ads", icon: "🚀", desc: "Anuncio de pago" }
      ];
    } else {
      options = [{ id: "feed", name: "Estándar", icon: "📱", desc: "Publicación normal" }];
    }

    return (
      <div className={styles.destinationGrid}>
        {options.map(opt => (
          <div 
            key={opt.id} 
            className={`${styles.destinationCard} ${destination === opt.id ? styles.destinationCardActive : ''}`}
            onClick={() => setDestination(opt.id)}
          >
            <div className={styles.destinationIcon}>{opt.icon}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700 }}>{opt.name}</span>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{opt.desc}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAdsConfig = () => (
    <div className={styles.configCard}>
      <div className={styles.cardHeader}><span className={styles.cardTitle}>Segmentación Meta Ads</span></div>
      <div className={styles.accordion}>
        <div className={styles.accordionHeader} onClick={() => toggleSection("objective")}>
          <span>🎯 Objetivo: {adsConfig.campaignObjective}</span>
          <span>{openSections.objective ? "▲" : "▼"}</span>
        </div>
        {openSections.objective && (
          <div className={styles.accordionBody}>
            <select className={styles.select} value={adsConfig.campaignObjective} onChange={(e) => setAdsConfig({...adsConfig, campaignObjective: e.target.value})}>
              <option value="engagement">Interacción</option>
              <option value="traffic">Tráfico</option>
              <option value="leads">Clientes Potenciales</option>
            </select>
          </div>
        )}
      </div>
      <div className={styles.accordion}>
        <div className={styles.accordionHeader} onClick={() => toggleSection("budget")}>
          <span>💰 Presupuesto: ${adsConfig.budgetAmount}</span>
          <span>{openSections.budget ? "▲" : "▼"}</span>
        </div>
        {openSections.budget && (
          <div className={styles.accordionBody}>
             <input type="number" className={styles.input} value={adsConfig.budgetAmount} onChange={(e) => setAdsConfig({...adsConfig, budgetAmount: Number(e.target.value)})} />
          </div>
        )}
      </div>
    </div>
  );

  if (!ad) return <div className={styles.container}>Cargando...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.mainLayout}>
        <div className={styles.leftNav}>
          <div className={`${styles.navIconWrapper} ${step >= 1 ? styles.navIconActive : ''}`} onClick={() => setStep(1)}>
            <span>👤</span>
            <span className={styles.navIconLabel}>Cuentas</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 2 ? styles.navIconActive : ''}`} onClick={() => setStep(2)}>
            <span>📍</span>
            <span className={styles.navIconLabel}>Destino</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 3 ? styles.navIconActive : ''}`} onClick={() => setStep(3)}>
            <span>✅</span>
            <span className={styles.navIconLabel}>Confirmar</span>
          </div>
        </div>

        <div className={styles.centerArea}>
          <div className={styles.cardHeader} style={{ background: "transparent", border: "none" }}>
             <h2 className={styles.cardTitle} style={{ fontSize: "1.5rem" }}>Publicar Anuncio</h2>
             <Link href="/ads" className={styles.btnSecondary} style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}>← Volver</Link>
          </div>

          {error && <div style={{ background: "rgba(243, 66, 95, 0.1)", border: "1px solid #f3425f", color: "#f3425f", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>⚠️ {error}</div>}

          {publishResults ? (
            <div className={styles.configCard}>
              <div className={styles.cardHeader}><span className={styles.cardTitle}>Resultados</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {publishResults.map((res, i) => {
                  const acc = socialAccounts.find(a => a.id === res.socialAccountId);
                  return (
                    <div key={i} className={`${styles.resultCard} ${res.status === 'published' ? styles.resultSuccess : styles.resultError}`}>
                      <div style={{ fontSize: "1.5rem" }}>{res.status === 'published' ? "✅" : "❌"}</div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 700 }}>{acc?.accountName || res.platform}</span>
                        <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>{res.status === 'published' ? "Publicado" : `Error: ${res.error}`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className={styles.btnPrimary} style={{ marginTop: "1rem" }} onClick={() => router.push("/ads")}>Finalizar</button>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className={styles.configCard}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>1. Cuentas de Destino</span></div>
                  <div className={styles.accountSelectionGrid}>
                    {socialAccounts.map(acc => (
                      <div key={acc.id} className={`${styles.accountCard} ${selectedAccountIds.includes(acc.id) ? styles.accountCardActive : ''}`} onClick={() => toggleAccountSelection(acc.id, acc.provider)}>
                        <div className={styles.accountAvatar}>{acc.provider[0].toUpperCase()}</div>
                        <div className={styles.accountInfo}><span className={styles.accountName}>{acc.accountName || acc.pageName}</span><span className={styles.accountHandle}>{acc.provider}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className={styles.configCard}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>2. Selección de Ubicación</span></div>
                  {renderDestinations()}
                </div>
              )}

              {step === 3 && destination === "ads" && renderAdsConfig()}
              
              {((step === 3 && destination !== "ads") || step === 4) && (
                <div className={styles.configCard}>
                   <div className={styles.cardHeader}><span className={styles.cardTitle}>Confirmar</span></div>
                   <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <p>Anuncio: <b>{ad.title}</b></p>
                      <p>Cuentas: <b>{selectedAccountIds.length}</b></p>
                      <p>Destino: <b>{destination}</b></p>
                   </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.rightSidebar}>
          <div className={styles.audienceGaugeCard}>
            <h3 className={styles.audienceGaugeTitle}>ESTIMACIÓN DE AUDIENCIA</h3>
            <div className={styles.gaugeWrapper}><div className={styles.gaugeIndicator} style={{ left: `${getAudienceEstimate()}%` }} /></div>
            <div className={styles.gaugeLabels}><span>Específico</span><span>Óptimo</span><span>Amplio</span></div>
          </div>
          <div className={styles.configCard} style={{ background: "transparent", borderStyle: "dashed" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, opacity: 0.6 }}>RESUMEN DE COSTO</span>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>Gratis (API Directa)</div>
          </div>
        </div>
      </div>

      {!publishResults && (
        <div className={styles.bottomBar}>
          <button type="button" className={styles.btnSecondary} onClick={() => step === 1 ? router.push("/ads") : setStep(s => s - 1)}>{step === 1 ? "Cancelar" : "Anterior"}</button>
          {((destination === "ads" && step < 4) || (destination !== "ads" && step < 3)) ? (
            <button type="button" className={styles.btnPrimary} onClick={handleNext}>Siguiente →</button>
          ) : (
            <button type="button" className={styles.btnPrimary} onClick={handlePublish} disabled={publishing || selectedAccountIds.length === 0}>
              {publishing ? "Publicando..." : "Publicar Ahora 🚀"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
