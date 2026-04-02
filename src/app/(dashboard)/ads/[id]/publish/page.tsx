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
  const [publishType, setPublishType] = useState<"organic" | "ads" | null>(null);
  const [origin, setOrigin] = useState<"feed" | "fanpage" | null>(null);
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

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accountId)) return prev.filter(id => id !== accountId);
      return [accountId]; // Single selection for now as per destination logic
    });
  };

  const getAudienceEstimate = () => {
    let score = 50;
    // Basic weighting for estimation
    if (adsConfig.interests.length > 0) score -= adsConfig.interests.length * 5;
    if (selectedAccountIds.length > 1) score += 20;
    return Math.max(10, Math.min(90, score));
  };

  const handleNext = () => {
    setError(null);
    if (step === 1 && !platform) return setError("Selecciona una plataforma");
    if (step === 2 && !publishType) return setError("Selecciona el tipo de publicación");
    if (step === 2 && platform === 'youtube' && publishType === 'ads') return setError("YouTube Ads no está disponible en esta versión.");
    
    if (step === 3) {
      if (publishType === 'organic' && !origin) return setError("Selecciona si es Feed o Fanpage");
      if (publishType === 'ads') {
        // Ads always go to account selection step
        if (selectedAccountIds.length === 0) return setError("Selecciona la Fanpage para el anuncio");
      }
    }

    if (step === 4) {
      if (publishType === 'organic' && origin === 'fanpage' && selectedAccountIds.length === 0) return setError("Selecciona una Fanpage");
    }

    // Branching logic for steps
    if (step === 3 && publishType === 'organic' && origin === 'feed') {
      // Auto-select personal profile if on Feed
      const personalAcc = socialAccounts.find(a => a.provider === platform && !a.pageId);
      if (personalAcc) {
        setSelectedAccountIds([personalAcc.id]);
        setDestination('feed');
      }
      setStep(5); // Go to confirm
    } else if (step === 3 && publishType === 'ads') {
      setDestination('ads');
      setStep(4);
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrevious = () => {
    setError(null);
    if (step === 5 && publishType === 'organic' && origin === 'feed') {
      setStep(3);
    } else {
      setStep(s => s - 1);
    }
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
              destination: publishType === 'ads' ? 'ads' : (origin === 'feed' ? 'feed' : 'fanpage'),
              adsConfig: publishType === 'ads' ? { ...adsConfig, linkUrl: ad.linkUrl } : null
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

  const renderPlatformSelection = () => (
    <div className={styles.destinationGrid}>
      {[
        { id: 'facebook', name: 'Facebook', icon: '🔵', desc: 'Feed y Fanpages' },
        { id: 'instagram', name: 'Instagram', icon: '📸', desc: 'Reels y Stories' },
        { id: 'youtube', name: 'YouTube', icon: '🔴', desc: 'Canal de Video' }
      ].map(p => (
        <div key={p.id} className={`${styles.destinationCard} ${platform === p.id ? styles.destinationCardActive : ''}`} onClick={() => setPlatform(p.id as any)}>
          <div className={styles.destinationIcon}>{p.icon}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700 }}>{p.name}</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{p.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTypeSelection = () => (
    <div className={styles.destinationGrid}>
      {[
        { id: 'organic', name: 'Publicación Orgánica', icon: '🌱', desc: 'Post gratuito a tu comunidad' },
        { id: 'ads', name: 'Anuncio Pagado (Ads)', icon: '📈', desc: 'Campaña con segmentación' }
      ].map(t => (
        <div key={t.id} className={`${styles.destinationCard} ${publishType === t.id ? styles.destinationCardActive : ''}`} onClick={() => setPublishType(t.id as any)}>
          <div className={styles.destinationIcon}>{t.icon}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700 }}>{t.name}</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{t.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderOriginSelection = () => (
    <div className={styles.destinationGrid}>
      {[
        { id: 'feed', name: 'Muro Personal (Feed)', icon: '👤', desc: 'Publicar en tu perfil' },
        { id: 'fanpage', name: 'Fanpage del Negocio', icon: '🚩', desc: 'Publicar en tu Página' }
      ].map(o => (
        <div key={o.id} className={`${styles.destinationCard} ${origin === o.id ? styles.destinationCardActive : ''}`} onClick={() => setOrigin(o.id as any)}>
          <div className={styles.destinationIcon}>{o.icon}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700 }}>{o.name}</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{o.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAccountSelection = () => {
    // Filter accounts by platform AND presence of pageId based on branching
    const filteredAccounts = socialAccounts.filter(acc => {
      const isPlatformMatch = acc.provider === platform;
      if (publishType === 'ads') return isPlatformMatch && acc.pageId; // Ads always need a page
      if (origin === 'fanpage') return isPlatformMatch && acc.pageId; // Fanpage choice needs a page
      return isPlatformMatch && !acc.pageId; // Feed needs personal profile
    });

    return (
      <div className={styles.accountSelectionGrid}>
        {filteredAccounts.length > 0 ? (
          filteredAccounts.map(acc => (
            <div key={acc.id} className={`${styles.accountCard} ${selectedAccountIds.includes(acc.id) ? styles.accountCardActive : ''}`} onClick={() => toggleAccountSelection(acc.id)}>
              <div className={styles.accountAvatar}>{acc.provider[0].toUpperCase()}</div>
              <div className={styles.accountInfo}>
                <span className={styles.accountName}>{acc.pageName || acc.accountName}</span>
                <span className={styles.accountHandle}>{acc.provider}</span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", width: "100%", padding: "2rem", opacity: 0.6 }}>No se encontraron cuentas para este destino.</div>
        )}
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
            <span>📱</span>
            <span className={styles.navIconLabel}>Plataforma</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 2 ? styles.navIconActive : ''}`} onClick={() => setStep(2)}>
            <span>📁</span>
            <span className={styles.navIconLabel}>Tipo</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 3 ? styles.navIconActive : ''}`} onClick={() => setStep(3)}>
            <span>📍</span>
            <span className={styles.navIconLabel}>Destino</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 4 ? styles.navIconActive : ''}`} onClick={() => setStep(4)}>
            <span>👤</span>
            <span className={styles.navIconLabel}>Cuenta</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 5 ? styles.navIconActive : ''}`} onClick={() => setStep(5)}>
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
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>1. Selecciona la Plataforma</span></div>
                  {renderPlatformSelection()}
                </div>
              )}

              {step === 2 && (
                <div className={styles.configCard}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>2. Tipo de Publicación</span></div>
                  {renderTypeSelection()}
                </div>
              )}

              {step === 3 && publishType === 'organic' && (
                <div className={styles.configCard}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>3. Ubicación del Post</span></div>
                  {renderOriginSelection()}
                </div>
              )}

              {(step === 4 || (step === 3 && publishType === 'ads')) && (
                 <div className={styles.configCard}>
                   <div className={styles.cardHeader}><span className={styles.cardTitle}>{publishType === 'ads' ? '3' : '4'}. Selecciona la Página</span></div>
                   {renderAccountSelection()}
                 </div>
              )}

              {step === 5 && publishType === 'ads' && renderAdsConfig()}
              
              {((step === 5 && publishType === 'organic') || (step === 6 && publishType === 'ads')) && (
                <div className={styles.configCard}>
                   <div className={styles.cardHeader}><span className={styles.cardTitle}>Confirmar Publicación</span></div>
                   <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <p>Anuncio: <b>{ad.title}</b></p>
                      <p>Plataforma: <b style={{ textTransform: "capitalize" }}>{platform}</b></p>
                      <p>Tipo: <b>{publishType === 'ads' ? 'Anuncio Pagado' : 'Post Orgánico'}</b></p>
                      <p>Ubicación: <b>{publishType === 'ads' ? 'Ads Manager' : (origin === 'feed' ? 'Muro Personal' : 'Fanpage')}</b></p>
                      {selectedAccountIds.length > 0 && (
                        <p>Cuenta: <b>{socialAccounts.find(a => a.id === selectedAccountIds[0])?.pageName || socialAccounts.find(a => a.id === selectedAccountIds[0])?.accountName}</b></p>
                      )}
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
          <button type="button" className={styles.btnSecondary} onClick={() => step === 1 ? router.push("/ads") : handlePrevious()}>{step === 1 ? "Cancelar" : "Anterior"}</button>
          {((publishType === "ads" && step < 6) || (publishType === "organic" && step < 5)) ? (
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
