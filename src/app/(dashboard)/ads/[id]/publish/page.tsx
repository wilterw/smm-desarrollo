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
  
  // Selections
  // Selections (Phase 11: Multi-account)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [platform, setPlatform] = useState<"facebook" | "instagram" | "youtube" | null>(null); // Still used for current UI context
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
    // Faux logic for the decorative gauge
    let score = 50;
    if (adsConfig.country) score += 10;
    if (adsConfig.city) score -= 15;
    if (adsConfig.interests.length > 0) score -= adsConfig.interests.length * 5;
    if (adsConfig.ageMax - adsConfig.ageMin < 20) score -= 15;
    return Math.max(10, Math.min(90, score));
  };
  
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    // Fetch ad data
    fetch("/api/ads").then(r => r.json()).then(ads => {
      const found = ads.find((a: any) => a.id === resolvedParams.id);
      if (found) setAd(found);
    });
    // Fetch social accounts
    fetch("/api/social/accounts").then(r => r.json()).then(setSocialAccounts);
  }, [resolvedParams.id]);

  if (!ad) return <div className={styles.container}>Cargando...</div>;

  const toggleAccountSelection = (accountId: string, accountPlatform: any) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accountId)) {
        const next = prev.filter(id => id !== accountId);
        // If no more accounts of this platform, clear platform context if needed
        return next;
      } else {
        setPlatform(accountPlatform); // Update context to the last selected platform
        return [...prev, accountId];
      }
    });
  };

  const isAnyAccountSelected = selectedAccountIds.length > 0;
  const selectedAccounts = socialAccounts.filter(a => selectedAccountIds.includes(a.id));

  const handleConnect = async (p: string) => {
    try {
      const res = await fetch(`/api/social/connect?provider=${p}`);
      const data = await res.json();
      if (data.url) {
        // Build popup centered
        const width = 600;
        const height = 700;
        const left = window.innerWidth / 2 - width / 2;
        const top = window.innerHeight / 2 - height / 2;
        window.open(data.url, "Conectar", `width=${width},height=${height},top=${top},left=${left}`);
        
        // Wait for popup to close to refresh accounts
        const checkClose = setInterval(() => {
          if (!document.hidden) {
            fetch("/api/social/accounts").then(r => r.json()).then(setSocialAccounts);
            clearInterval(checkClose);
          }
        }, 2000);
      }
    } catch (e) {
      alert("Error al conectar");
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedAccountIds.length === 0) return alert("Selecciona al menos una cuenta para publicar");
    if (step === 2 && !destination) return alert("Selecciona un destino");
    setStep(s => s + 1);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adId: ad.id,
          destinations: selectedAccounts.map(acc => ({
            platform: acc.provider,
            socialAccountId: acc.id,
            destination,
            adsConfig: destination === "ads" ? { ...adsConfig, linkUrl: ad.linkUrl } : null
          }))
        })
      });
      
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        alert(data.error || "Error al publicar");
      }
    } finally {
      setPublishing(false);
    }
  };

  // Render Helpers
  const renderDestinations = () => {
    let options: { id: Destination, name: string, icon: string, desc: string }[] = [];
    
    if (platform === "facebook") {
      options = [
        { id: "feed", name: "Feed Personal", icon: "👤", desc: "Publicar en tu muro de Facebook" },
        { id: "fanpage", name: "Fanpage", icon: "🚩", desc: "Publicar en la página de tu negocio" },
        { id: "both", name: "Ambos", icon: "🤝", desc: "Publicar en ambos lados" },
        { id: "ads", name: "Facebook Ads", icon: "📈", desc: "Crear una campaña publicitaria de pago" }
      ];
    } else if (platform === "instagram") {
      options = [
        { id: "feed", name: "Feed", icon: "📸", desc: "Publicar como un post cuadrado estándar" },
        { id: "reels", name: "Reel", icon: "🎬", desc: "Publicar como video vertical (requiere video)" },
        { id: "stories", name: "Historia", icon: "⏱️", desc: "Publicar en tus Historias (24 horas)" },
        { id: "ads", name: "Instagram Ads", icon: "🚀", desc: "Configurar anuncio de pago en Instagram" }
      ];
    } else if (platform === "youtube") {
      options = [
        { id: "feed", name: "Video Largo", icon: "📺", desc: "Publicar en formato clásico de YouTube" },
        { id: "shorts", name: "Shorts", icon: "📱", desc: "Publicar como un video corto vertical" },
        { id: "ads", name: "YouTube Ads", icon: "🎯", desc: "Campaña de video pagada" }
      ];
    }

    return (
      <div className={styles.grid2}>
        {options.map(opt => {
          // Disable video options if media is not video
          const isVideoReq = ["reels", "shorts"].includes(opt.id) && ad.mediaType !== "video";
          return (
            <div 
              key={opt.id} 
              className={`${styles.destinationCard} ${destination === opt.id ? styles.destinationCardSelected : ''}`}
              onClick={() => !isVideoReq && setDestination(opt.id)}
              style={isVideoReq ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              <div className={styles.destinationCardIcon}>{opt.icon}</div>
              <div className={styles.destinationInfo}>
                <h4>{opt.name}</h4>
                <p>{isVideoReq ? "Requiere subir archivo de video" : opt.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAdsConfig = () => (
    <div className={`glass-panel`} style={{ padding: "1.5rem" }}>
      <h3 className={styles.sectionTitle} style={{ marginBottom: "1.5rem" }}>Segmentación de Audiencia (Meta Ads)</h3>
      
      {/* Decorative Audience Gauge */}
      <div className={styles.audienceGaugeContainer}>
        <div className={styles.audienceGaugeTitle}>Estimación de la Audiencia</div>
        <div className={styles.audienceGaugeBar}>
          <div className={styles.audienceGaugeIndicator} style={{ left: `${getAudienceEstimate()}%` }} />
        </div>
        <div className={styles.audienceGaugeLabels}>
          <span>Específica</span>
          <span>Definida</span>
          <span>Amplia</span>
        </div>
      </div>

      {/* 1. Objetivo */}
      <div className={styles.accordion}>
        <div className={styles.accordionHeader} onClick={() => toggleSection("objective")}>
          <span>🎯 Objetivo de Campaña</span>
          <span className={styles.accordionIcon}>{openSections.objective ? "▲" : "▼"}</span>
        </div>
        <div className={`${styles.accordionBody} ${!openSections.objective ? styles.accordionBodyHidden : ""}`}>
          <select className={styles.select} value={adsConfig.campaignObjective} onChange={(e) => setAdsConfig({...adsConfig, campaignObjective: e.target.value})}>
            <option value="reach">Alcance</option>
            <option value="traffic">Tráfico</option>
            <option value="engagement">Interacción (Engagement)</option>
            <option value="leads">Generación de Clientes Potenciales</option>
            <option value="sales">Ventas / Conversiones</option>
          </select>
        </div>
      </div>

      {/* 2. Ubicación Geográfica */}
      <div className={styles.accordion}>
        <div className={styles.accordionHeader} onClick={() => toggleSection("location")}>
          <span>📍 Ubicación Geográfica</span>
          <span className={styles.accordionIcon}>{openSections.location ? "▲" : "▼"}</span>
        </div>
        <div className={`${styles.accordionBody} ${!openSections.location ? styles.accordionBodyHidden : ""}`}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>País</label>
              <select className={styles.select} value={adsConfig.country} onChange={(e) => setAdsConfig({...adsConfig, country: e.target.value})}>
                <option value="US">Estados Unidos</option>
                <option value="MX">México</option>
                <option value="ES">España</option>
                <option value="CO">Colombia</option>
                <option value="AR">Argentina</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Estado / Región</label>
              <input className={styles.input} placeholder="Ej: Florida" value={adsConfig.state} onChange={(e) => setAdsConfig({...adsConfig, state: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Ciudad</label>
              <input className={styles.input} placeholder="Ej: Miami" value={adsConfig.city} onChange={(e) => setAdsConfig({...adsConfig, city: e.target.value})} />
            </div>
          </div>
          {adsConfig.city && (
            <div className={styles.formGroup} style={{ marginTop: "0.5rem" }}>
              <label className={styles.label}>Radio ({adsConfig.radiusKm} km)</label>
              <div className={styles.sliderContainer}>
                <span>1</span>
                <input type="range" min="1" max="100" value={adsConfig.radiusKm} onChange={(e) => setAdsConfig({...adsConfig, radiusKm: Number(e.target.value)})} />
                <span>100</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Demografía */}
      <div className={styles.accordion}>
        <div className={styles.accordionHeader} onClick={() => toggleSection("demographics")}>
          <span>👥 Demografía</span>
          <span className={styles.accordionIcon}>{openSections.demographics ? "▲" : "▼"}</span>
        </div>
        <div className={`${styles.accordionBody} ${!openSections.demographics ? styles.accordionBodyHidden : ""}`}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Edad (Min - Max)</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input className={styles.input} type="number" min="13" max="65" value={adsConfig.ageMin} onChange={(e) => setAdsConfig({...adsConfig, ageMin: Number(e.target.value)})} />
                <input className={styles.input} type="number" min="13" max="65" value={adsConfig.ageMax} onChange={(e) => setAdsConfig({...adsConfig, ageMax: Number(e.target.value)})} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Género</label>
              <select className={styles.select} value={adsConfig.gender} onChange={(e) => setAdsConfig({...adsConfig, gender: e.target.value})}>
                <option value="all">Todos</option>
                <option value="male">Hombres</option>
                <option value="female">Mujeres</option>
              </select>
            </div>
          </div>
          <div className={styles.formRow} style={{ marginTop: "1rem" }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Estado Civil</label>
              <select className={styles.select} value={adsConfig.maritalStatus} onChange={(e) => setAdsConfig({...adsConfig, maritalStatus: e.target.value})}>
                <option value="all">Todos</option>
                <option value="single">Soltero/a</option>
                <option value="married">Casado/a</option>
                <option value="relationship">En una relación</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nivel de Educación</label>
              <select className={styles.select} value={adsConfig.education} onChange={(e) => setAdsConfig({...adsConfig, education: e.target.value})}>
                <option value="all">Todos</option>
                <option value="highschool">Secundaria</option>
                <option value="college">Universidad</option>
                <option value="masters">Posgrado / Maestría</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Intereses y Comportamientos */}
      <div className={styles.accordion}>
        <div className={styles.accordionHeader} onClick={() => toggleSection("interests")}>
          <span>💡 Intereses y Comportamientos</span>
          <span className={styles.accordionIcon}>{openSections.interests ? "▲" : "▼"}</span>
        </div>
        <div className={`${styles.accordionBody} ${!openSections.interests ? styles.accordionBodyHidden : ""}`}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Intereses principales</label>
            <div className={styles.checkboxGrid}>
              {["Bienes Raíces", "Inversiones", "Viajes", "Deportes", "Tecnología", "Moda", "Negocios", "Salud", "Gastronomía"].map(interest => (
                <label key={interest} className={styles.checkboxLabel}>
                  <input type="checkbox" checked={adsConfig.interests.includes(interest)} onChange={() => toggleArrayItem("interests", interest)} />
                  {interest}
                </label>
              ))}
            </div>
          </div>
          <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
            <label className={styles.label}>Comportamientos</label>
            <div className={styles.checkboxGrid}>
              {["Compradores online", "Viajeros frecuentes", "Administradores de páginas", "Usuarios móviles 4G/5G"].map(behavior => (
                <label key={behavior} className={styles.checkboxLabel}>
                  <input type="checkbox" checked={adsConfig.behaviors.includes(behavior)} onChange={() => toggleArrayItem("behaviors", behavior)} />
                  {behavior}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Placements */}
      <div className={styles.accordion}>
        <div className={styles.accordionHeader} onClick={() => toggleSection("placements")}>
          <span>📺 Ubicaciones de Publicación (Placements)</span>
          <span className={styles.accordionIcon}>{openSections.placements ? "▲" : "▼"}</span>
        </div>
        <div className={`${styles.accordionBody} ${!openSections.placements ? styles.accordionBodyHidden : ""}`}>
          <div className={styles.formGroup}>
            <select className={styles.select} value={adsConfig.placements} onChange={(e) => setAdsConfig({...adsConfig, placements: e.target.value})}>
              <option value="auto">Ubicaciones Automáticas (Recomendado)</option>
              <option value="manual_feed">Solo Feeds Principales</option>
              <option value="manual_stories">Solo Historias y Reels</option>
              <option value="manual_marketplace">Incluir Marketplace</option>
            </select>
            <p style={{ fontSize: "0.80rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Automático optimiza tu presupuesto en toda la red para lograr mejores resultados.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Presupuesto y Programación */}
      <div className={styles.accordion}>
        <div className={styles.accordionHeader} onClick={() => toggleSection("budget")}>
          <span>💰 Presupuesto y Programación</span>
          <span className={styles.accordionIcon}>{openSections.budget ? "▲" : "▼"}</span>
        </div>
        <div className={`${styles.accordionBody} ${!openSections.budget ? styles.accordionBodyHidden : ""}`}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tipo de Presupuesto</label>
              <select className={styles.select} value={adsConfig.budgetType} onChange={(e) => setAdsConfig({...adsConfig, budgetType: e.target.value as "daily"|"total"})}>
                <option value="daily">Presupuesto Diario</option>
                <option value="total">Presupuesto Total de la Campaña</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Monto (USD)</label>
              <input className={styles.input} type="number" min="1" value={adsConfig.budgetAmount} onChange={(e) => setAdsConfig({...adsConfig, budgetAmount: Number(e.target.value)})} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Estrategia de Puja</label>
              <select className={styles.select} value={adsConfig.bidStrategy} onChange={(e) => setAdsConfig({...adsConfig, bidStrategy: e.target.value})}>
                <option value="lowest_cost">Mayor volumen (Menor costo)</option>
                <option value="cost_cap">Límite de costo</option>
                <option value="roas">Objetivo de ROAS</option>
              </select>
            </div>
          </div>
          <div className={styles.formRow} style={{ marginTop: "1rem" }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Fecha Inicio</label>
              <input className={styles.input} type="date" value={adsConfig.startDate} onChange={(e) => setAdsConfig({...adsConfig, startDate: e.target.value})} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Fecha Fin (Opcional si es diario)</label>
              <input className={styles.input} type="date" value={adsConfig.endDate} onChange={(e) => setAdsConfig({...adsConfig, endDate: e.target.value})} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <Link href="/campaigns" className={styles.backLink}>← Cancelar</Link>
      <div className={styles.header}>
        <h2 className={styles.title}>Publicar Anuncio</h2>
        <p className={styles.subtitle}>Configura dónde y cómo publicar: <strong>{ad.title}</strong></p>
      </div>

      <div className={styles.stepper}>
        {[
          { num: 1, label: "Plataforma" },
          { num: 2, label: "Destino" },
          { num: 3, label: destination === "ads" ? "Segmentación" : "Resumen" },
          ...(destination === "ads" ? [{ num: 4, label: "Resumen" }] : [])
        ].map((s) => (
          <div key={s.num} className={`${styles.step} ${step >= s.num ? styles.stepActive : ''}`}>
            <div className={styles.stepCircle}>{s.num}</div>
            <div className={styles.stepLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.stepContent}>
        {/* STEP 1: ACCOUNT SELECTION */}
        {step === 1 && (
          <div>
            <h3 className={styles.sectionTitle}>Selecciona tus cuentas de redes sociales</h3>
            <p className={styles.subtitle} style={{ marginBottom: "1.5rem" }}>Puedes seleccionar múltiples cuentas de la misma plataforma.</p>
            
            <div className={styles.platformSections}>
              {[
                { key: "facebook", label: "Facebook", connectProvider: "facebook" },
                { key: "instagram", label: "Instagram", connectProvider: "facebook" },
                { key: "youtube", label: "YouTube", connectProvider: "youtube" }
              ].map(({ key: pKey, label, connectProvider }) => {
                const platformAccounts = socialAccounts.filter((a: any) => a.provider === pKey);

                return (
                  <div key={pKey} className={styles.platformGroup}>
                    <h4 className={styles.platformGroupTitle}>
                      <img 
                        src={`/images/${pKey.toLowerCase()}.png`} 
                        alt={pKey} 
                        style={{ width: "24px", height: "24px", objectFit: "contain" }} 
                      />
                      {label}
                      {platformAccounts.length > 0 && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>
                          ({platformAccounts.length} conectada{platformAccounts.length > 1 ? "s" : ""})
                        </span>
                      )}
                    </h4>

                    {platformAccounts.length > 0 ? (
                      <div className={styles.accountSelectionGrid}>
                        {platformAccounts.map((acc: any) => (
                          <div 
                            key={acc.id} 
                            className={`${styles.accountSelectionCard} ${selectedAccountIds.includes(acc.id) ? styles.accountSelectionCardActive : ""}`}
                            onClick={() => toggleAccountSelection(acc.id, pKey)}
                          >
                            <div className={styles.accountCheck}>
                              {selectedAccountIds.includes(acc.id) ? "✓" : ""}
                            </div>
                            <div className={styles.accountInfo}>
                              <div className={styles.accountName}>{acc.accountName || "Cuenta conectada"}</div>
                              <div className={styles.accountHandle}>{acc.provider === "facebook" ? (acc.pageName || "Perfil") : (acc.accountName || acc.providerAccountId)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.platformEmpty}>
                        <span>No hay cuentas de {label} conectadas</span>
                        <button type="button" className={styles.btnConnectMini} onClick={() => handleConnect(connectProvider)}>
                          + Conectar {label}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: DESTINATION */}
        {step === 2 && (
          <div>
            <h3 className={styles.sectionTitle}>¿Dónde quieres publicar en {platform}?</h3>
            {renderDestinations()}
          </div>
        )}

        {/* STEP 3 (IF ADS): ADS CONFIG */}
        {step === 3 && destination === "ads" && renderAdsConfig()}

        {/* LAST STEP: SUMMARY */}
        {((step === 3 && destination !== "ads") || step === 4) && (
          <div className={styles.summaryBox}>
            <h3 className={styles.sectionTitle}>Resumen de Publicación</h3>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Anuncio</span>
              <span className={styles.summaryValue}>{ad.title}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Cuentas Destino</span>
              <div className={styles.summaryValue}>
                {selectedAccounts.map(acc => (
                  <div key={acc.id} style={{ fontSize: "0.8rem", color: "var(--accent-primary)" }}>
                     • {acc.provider.charAt(0).toUpperCase() + acc.provider.slice(1)}: {acc.accountName || acc.pageName || acc.providerAccountId}
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Destino</span>
              <span className={styles.summaryValue} style={{ textTransform: "capitalize" }}>{destination}</span>
            </div>
            {destination === "ads" && (
              <>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Presupuesto</span>
                  <span className={styles.summaryValue}>${adsConfig.budgetAmount} USD ({adsConfig.budgetType === "daily" ? "Diario" : "Total"})</span>
                </div>
                {adsConfig.interests.length > 0 && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Intereses</span>
                    <span className={styles.summaryValue}>{adsConfig.interests.join(", ")}</span>
                  </div>
                )}
                {ad.linkUrl && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Enlace de Clic</span>
                    <span className={styles.summaryValue}>{ad.linkUrl}</span>
                  </div>
                )}
              </>
            )}
            
            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)" }}>
              <strong style={{ fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>Previsualización del post:</strong>
              <div style={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>
                {ad.title}
                {"\n"}
                {ad.description}
                {"\n\n"}
                <span style={{ color: "var(--accent-blue)" }}>{ad.campaign?.hashtags}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {step > 1 ? (
          <button type="button" className={styles.btnSecondary} onClick={() => setStep(s => s - 1)}>Atrás</button>
        ) : (
          <div></div>
        )}

        {((step === 3 && destination !== "ads") || step === 4) ? (
          <button type="button" className={styles.btnPrimary} onClick={handlePublish} disabled={publishing}>
            {publishing ? "Publicando..." : "Confirmar y Publicar 🚀"}
          </button>
        ) : (
          <button type="button" className={styles.btnPrimary} onClick={handleNext}>
            Siguiente →
          </button>
        )}
      </div>
    </div>
  );
}
