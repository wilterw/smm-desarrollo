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
  const [selectedTitular, setSelectedTitular] = useState<string | null>(null);
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
      return [...prev, accountId]; // Multiple selection allowed
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
    if (step === 3 && !selectedTitular) return setError("Selecciona la cuenta titular");
    
    if (step === 4) {
      if (!origin) return setError("Selecciona si es Feed o Fanpage");
      
      if (publishType === 'organic' && origin === 'feed') {
        const personalAcc = socialAccounts.find(a => a.provider === platform && a.accountName === selectedTitular && !a.pageId);
        if (personalAcc) {
          setSelectedAccountIds([personalAcc.id]);
          setStep(6); // Step 6 is Confirm
          return;
        } else {
          return setError("No se encontró una cuenta de perfil personal para este titular.");
        }
      }
    }

    if (step === 5 && selectedAccountIds.length === 0) {
      return setError("Selecciona al menos una Fanpage");
    }

    setStep(s => s + 1);
  };

  const handlePrevious = () => {
    setError(null);
    if (step === 6 && publishType === 'organic' && origin === 'feed') {
      setStep(4);
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
              destination: origin === 'feed' ? 'feed' : 'fanpage',
              publishType,
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
        <div key={p.id} className={`${styles.destinationCard} ${platform === p.id ? styles.destinationCardActive : ''}`} onClick={() => { setPlatform(p.id as any); setError(null); setStep(2); }}>
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
        { id: 'organic', name: 'Publicación Orgánica', icon: '🌱', desc: 'Muro Personal o Fanpage' },
        { id: 'ads', name: 'Anuncio Pagado (Ads)', icon: '📈', desc: 'Campaña publicitaria' }
      ].map(t => (
        <div key={t.id} className={`${styles.destinationCard} ${publishType === t.id ? styles.destinationCardActive : ''}`} onClick={() => { setPublishType(t.id as any); setError(null); setStep(3); }}>
          <div className={styles.destinationIcon}>{t.icon}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700 }}>{t.name}</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{t.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTitularSelection = () => {
    const platformAccounts = socialAccounts.filter(a => a.provider === platform);
    const uniqueTitulars = Array.from(new Set(platformAccounts.map(a => a.accountName))).filter(Boolean);

    return (
      <div className={styles.destinationGrid}>
        {uniqueTitulars.map(name => (
          <div key={name} className={`${styles.destinationCard} ${selectedTitular === name ? styles.destinationCardActive : ''}`} onClick={() => { setSelectedTitular(name); setError(null); setStep(4); }}>
            <div className={styles.destinationIcon}>👤</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700 }}>{name}</span>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Titular de Cuenta</span>
            </div>
          </div>
        ))}
        {uniqueTitulars.length === 0 && (
          <div style={{ textAlign: "center", width: "100%", padding: "2rem", opacity: 0.6 }}>No hay cuentas conectadas de {platform}.</div>
        )}
      </div>
    );
  };

  const renderOriginSelection = () => (
    <div className={styles.destinationGrid}>
      {[
        { id: 'feed', name: 'Muro Personal (Feed)', icon: '👤', desc: 'Tu perfil personal' },
        { id: 'fanpage', name: 'Fanpage del Negocio', icon: '🚩', desc: 'Tu página corporativa' }
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
    const filteredAccounts = socialAccounts.filter(acc => 
      acc.provider === platform && 
      acc.accountName === selectedTitular && 
      acc.pageId
    );

    return (
      <div className={styles.accountSelectionGrid}>
        {filteredAccounts.length > 0 ? (
          filteredAccounts.map(acc => (
            <div key={acc.id} className={`${styles.accountCard} ${selectedAccountIds.includes(acc.id) ? styles.accountCardActive : ''}`} onClick={() => toggleAccountSelection(acc.id)}>
              <div className={styles.accountAvatar}>🚩</div>
              <div className={styles.accountInfo}>
                <span className={styles.accountName}>{acc.pageName || "Sin nombre"}</span>
                <span className={styles.accountHandle}>Página vinculada</span>
              </div>
              <div style={{ marginLeft: "auto", fontSize: "1.2rem" }}>
                {selectedAccountIds.includes(acc.id) ? "✅" : "➕"}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", width: "100%", padding: "2rem", opacity: 0.6 }}>No se encontraron Fanpages para este titular.</div>
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
            <span>👤</span>
            <span className={styles.navIconLabel}>Titular</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 4 ? styles.navIconActive : ''}`} onClick={() => setStep(4)}>
            <span>📍</span>
            <span className={styles.navIconLabel}>Ubicación</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 5 ? styles.navIconActive : ''}`} onClick={() => setStep(5)}>
            <span>🚩</span>
            <span className={styles.navIconLabel}>Páginas</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 6 ? styles.navIconActive : ''}`} onClick={() => setStep(6)}>
            <span>🆗</span>
            <span className={styles.navIconLabel}>Publicar</span>
          </div>
        </div>

        <div className={styles.centerArea}>
          <div className={styles.cardHeader} style={{ background: "transparent", border: "none" }}>
             <h2 className={styles.cardTitle} style={{ fontSize: "1.5rem" }}>Publicar Creativo</h2>
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
                        <span style={{ fontWeight: 700 }}>{acc?.pageName || acc?.accountName || res.platform}</span>
                        <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>{res.status === 'published' ? "¡Publicado!" : `Error: ${res.error}`}</span>
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
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>1. Elige la Red Social</span></div>
                  {renderPlatformSelection()}
                </div>
              )}

              {step === 2 && (
                <div className={styles.configCard}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>2. ¿Orgánico o Ads?</span></div>
                  {renderTypeSelection()}
                </div>
              )}

              {step === 3 && (
                <div className={styles.configCard}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>3. Selecciona la Cuenta Titular</span></div>
                  {renderTitularSelection()}
                </div>
              )}

              {step === 4 && (
                <div className={styles.configCard}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>4. ¿Feed o Fanpage?</span></div>
                  {renderOriginSelection()}
                </div>
              )}

              {step === 5 && (
                 <div className={styles.configCard}>
                   <div className={styles.cardHeader}><span className={styles.cardTitle}>5. Elige la(s) Fanpage(s)</span></div>
                   {renderAccountSelection()}
                 </div>
              )}

              {(step === 6 && publishType === 'ads') && renderAdsConfig()}
              
              {((step === 6 && publishType === 'organic') || (step === 7 && publishType === 'ads')) && (
                <div className={styles.configCard}>
                   <div className={styles.cardHeader}><span className={styles.cardTitle}>Resumen para Publicar</span></div>
                   <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", marginTop: "0.5rem" }}>
                      <p>Anuncio: <b>{ad.title}</b></p>
                      <p>Plataforma: <b style={{ textTransform: "capitalize" }}>{platform}</b></p>
                      <p>Titular: <b>{selectedTitular}</b></p>
                      <p>Tipo: <b>{publishType === 'ads' ? 'Anuncio' : 'Orgánico'}</b></p>
                      <p>Ubicación: <b>{origin === 'feed' ? 'Muro Personal' : 'Fanpage'}</b></p>
                      <div className={styles.accountSelectionGrid} style={{ marginTop: "0.5rem", background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px" }}>
                        {selectedAccountIds.map(id => {
                          const acc = socialAccounts.find(a => a.id === id);
                          return <div key={id} style={{ fontSize: "0.85rem" }}>✔️ {acc.pageName || acc.accountName}</div>;
                        })}
                      </div>
                   </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.rightSidebar}>
          <div className={styles.audienceGaugeCard}>
            <h3 className={styles.audienceGaugeTitle}>AUDIENCIA ESTIMADA</h3>
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
          {((publishType === "ads" && step < 7) || (publishType === "organic" && step < 6)) ? (
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
