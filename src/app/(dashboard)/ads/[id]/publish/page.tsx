"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./Publish.module.css";

type AdsConfig = {
  campaignObjective: string;
  ctaLabel: string;
  advantageContent: boolean;
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
  interests: { id: string, name: string }[];
  locations: { key: string, name: string, type: string }[];
  behaviors: string[];
  customAudiences: string[];
  placements: string[];
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
  const [publishType, setType] = useState<"organic" | "ads" | null>(null);
  const [selectedTitular, setSelectedTitular] = useState<string | null>(null);
  const [origin, setOrigin] = useState<"feed" | "fanpage" | "reels" | "stories" | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [adsConfig, setAdsConfig] = useState<AdsConfig>({
    campaignObjective: "MESSAGES",
    ctaLabel: "SEND_MESSAGE",
    advantageContent: true,
    country: "US",
    state: "",
    city: "",
    radiusKm: 25,
    ageMin: 18,
    ageMax: 65,
    gender: "all",
    languages: [],
    maritalStatus: "all",
    education: "all",
    interests: [],
    locations: [],
    behaviors: [],
    customAudiences: [],
    placements: ["facebook_feed", "facebook_stories", "instagram_feed", "instagram_stories"],
    budgetType: "daily",
    budgetAmount: 10,
    bidStrategy: "lowest_cost",
    startDate: new Date().toISOString().split('T')[0],
    endDate: ""
  });

  const [showObjectiveModal, setShowObjectiveModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<"interest" | "location">("interest");

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
    // Fetch detailed ad data including previous publication budget
    fetch(`/api/ads/${resolvedParams.id}`).then(r => r.json()).then(foundAd => {
      if (foundAd && !foundAd.error) {
        setAd(foundAd);
        
        // Pre-populate adsConfig if there's a previous budget/targeting
        const lastPaidPub = foundAd.publications?.find((p: any) => p.type === 'paid');
        if (lastPaidPub && lastPaidPub.adBudget) {
          const budget = lastPaidPub.adBudget;
          try {
            const target = budget.targetAudience ? JSON.parse(budget.targetAudience) : {};
            setAdsConfig(prev => ({
              ...prev,
              ...target,
              budgetAmount: budget.dailyBudget || budget.totalBudget || prev.budgetAmount,
              budgetType: budget.dailyBudget ? "daily" : "total",
              startDate: budget.startDate ? new Date(budget.startDate).toISOString().split('T')[0] : prev.startDate,
              endDate: budget.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : prev.endDate,
            }));
          } catch (e) {
            console.error("Error parsing saved audience", e);
          }
        }
      }
    });

    fetch("/api/social/accounts").then(r => r.json()).then(accounts => {
      // Dev Mock
      if (accounts.length === 0) {
        setSocialAccounts([{ id: "mock-fb", provider: "facebook", accountName: "SML Pro Account", pageName: "Econos Real Estate", pageId: "123", accessToken: "mock" }]);
      } else {
        setSocialAccounts(accounts);
      }
    });
  }, [resolvedParams.id]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accountId)) return prev.filter(id => id !== accountId);
      return [...prev, accountId];
    });
  };

  const getAudienceEstimate = () => {
    let score = 50;
    if (adsConfig.interests.length > 0) score -= adsConfig.interests.length * 5;
    if (selectedAccountIds.length > 1) score += 20;
    return Math.max(10, Math.min(90, score));
  };

  const handleNext = () => {
    setError(null);
    if (step === 1 && !platform) return setError("Selecciona una plataforma");
    if (step === 2 && !selectedTitular) return setError("Selecciona la cuenta titular");
    if (step === 3 && !publishType) return setError("Selecciona si es Orgánico o Ads");
    
    if (step === 4) {
      if (publishType === 'organic' && !origin) return setError("Selecciona el origen");
      if (selectedAccountIds.length === 0) return setError("Selecciona al menos una Fanpage/Cuenta");
    }

    // Housing Category Enforcement
    if (step === 4 && publishType === 'ads' && platform === 'facebook') {
      setAdsConfig(prev => ({
        ...prev,
        ageMin: 18,
        ageMax: 65,
        gender: 'all',
        radiusKm: Math.max(prev.radiusKm, 25)
      }));
    }

    setStep(s => s + 1);
  };

  const handlePrevious = () => {
    setError(null);
    setStep(s => s - 1);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishResults(null);
    setError(null);
    try {
      // Auto-save ad state (Text, Link, Hashtags) before publishing
      await fetch(`/api/ads/${ad.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: ad.description,
          linkUrl: ad.linkUrl,
          hashtags: ad.campaign?.hashtags
        })
      });

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
              destination: publishType === 'ads' ? 'ads' : (origin || 'feed'), 
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
        { id: 'facebook', name: 'Facebook', icon: '🔵', desc: 'Muro y Fanpages de FB' },
        { id: 'instagram', name: 'Instagram', icon: '📸', desc: 'Fotos y Reels de IG' },
        { id: 'youtube', name: 'YouTube', icon: '🔴', desc: 'Videos y Shorts de YT' }
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

  const renderTitularSelection = () => {
    const platformAccounts = socialAccounts.filter(a => {
      if (platform === 'instagram') return a.provider === 'facebook' && a.igAccountId;
      return a.provider === platform;
    });
    const uniqueTitulars = Array.from(new Set(platformAccounts.map(a => a.accountName))).filter(Boolean);

    return (
      <div className={styles.destinationGrid}>
        {uniqueTitulars.map(name => (
          <div key={name} className={`${styles.destinationCard} ${selectedTitular === name ? styles.destinationCardActive : ''}`} onClick={() => { setSelectedTitular(name); setError(null); setStep(3); }}>
            <div className={styles.destinationIcon}>👤</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700 }}>{name}</span>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Cuenta Conectada</span>
            </div>
          </div>
        ))}
        {uniqueTitulars.length === 0 && (
          <div style={{ textAlign: "center", width: "100%", padding: "2rem", opacity: 0.6 }}>No hay cuentas vinculadas de {platform}.</div>
        )}
      </div>
    );
  };

  const renderConfigSection = () => {
    return (
      <div className={styles.destinationGrid}>
        {[
          { id: 'organic', name: 'Orgánico', icon: '🌱', desc: 'Muro o Fanpage' },
          { id: 'ads', name: 'Anuncio (Ads)', icon: '📈', desc: 'Campaña pagada' }
        ].map(t => (
          <div key={t.id} className={`${styles.destinationCard} ${publishType === t.id ? styles.destinationCardActive : ''}`} onClick={() => { setType(t.id as any); setError(null); setStep(4); }}>
            <div className={styles.destinationIcon}>{t.icon}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700 }}>{t.name}</span>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{t.desc}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderIdentitySelection = () => {
    if (publishType === 'organic' && !origin) {
      const options = [
        { id: 'feed', name: platform === 'facebook' ? 'Reservado Personal' : 'Perfil (Feed)', icon: '👤', desc: platform === 'facebook' ? 'No permitido por Meta' : 'Muro de la cuenta', disabled: platform === 'facebook' },
        { id: 'fanpage', name: 'Fanpages del Titular', icon: '🚩', desc: 'Publicar en tus páginas', disabled: false },
        { id: 'reels', name: 'Instagram Reels', icon: '🎬', desc: 'Video vertical 9:16', disabled: platform !== 'instagram' },
        { id: 'stories', name: 'Instagram Stories', icon: '✨', desc: 'Contenido 24h', disabled: platform !== 'instagram' }
      ];

      return (
        <div className={styles.destinationGrid}>
          {options.map(o => (
            <div key={o.id} className={`${styles.destinationCard} ${origin === o.id ? styles.destinationCardActive : ''}`} 
              style={o.disabled ? { opacity: 0.5, cursor: "not-allowed", filter: "grayscale(1)" } : {}}
              onClick={() => {
                if (o.disabled) return;
                setOrigin(o.id as any);
                if (o.id === 'feed') {
                  const personalAcc = socialAccounts.find(a => a.provider === platform && a.accountName === selectedTitular && !a.pageId);
                  if (personalAcc) setSelectedAccountIds([personalAcc.id]);
                }
              }}>
              <div className={styles.destinationIcon}>{o.icon}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 700 }}>{o.name}</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{o.desc}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const filteredFanpages = socialAccounts.filter(acc => {
      const isCorrectPlatform = platform === 'instagram' ? 
        (acc.provider === 'facebook' && acc.igAccountId) : 
        (acc.provider === platform);
      
      return isCorrectPlatform && acc.accountName === selectedTitular && acc.pageId;
    });

    return (
      <div className={styles.accountSelectionGrid}>
        {filteredFanpages.map(acc => (
          <div key={acc.id} className={`${styles.accountCard} ${selectedAccountIds.includes(acc.id) ? styles.accountCardActive : ''}`} onClick={() => toggleAccountSelection(acc.id)}>
            <div className={styles.accountAvatar}>🚩</div>
            <div className={styles.accountInfo}>
              <span className={styles.accountName}>{acc.pageName || "Página vinculada"}</span>
              <span className={styles.accountHandle}>{platform === 'facebook' ? 'Fanpage' : 'Instagram Page'} de {acc.accountName}</span>
            </div>
            <div style={{ marginLeft: "auto", fontSize: "1.2rem" }}>{selectedAccountIds.includes(acc.id) ? "✅" : "➕"}</div>
          </div>
        ))}
      </div>
    );
  };

  const handleSearch = async (term: string, type: "interest" | "location") => {
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setSearchType(type);
    try {
      const acc = socialAccounts.find(a => a.id === selectedAccountIds[0]) || socialAccounts.find(a => a.accountName === selectedTitular);
      if (!acc?.accessToken) return;
      
      const res = await fetch(`/api/social/facebook/search?q=${encodeURIComponent(term)}&type=${type === 'interest' ? 'adinterest' : 'adgeolocation'}&accessToken=${acc.accessToken}`);
      const data = await res.json();
      setSearchResults(data || []);
    } catch (e) {
      console.error("Search error", e);
    } finally {
      setIsSearching(false);
    }
  };

  const selectTargetingItem = (item: any) => {
    if (searchType === 'interest') {
      if (!adsConfig.interests.find(i => i.id === item.id)) {
        setAdsConfig(prev => ({ ...prev, interests: [...prev.interests, { id: item.id, name: item.name }] }));
      }
    } else {
      if (!adsConfig.locations.find(l => l.key === item.key)) {
        setAdsConfig(prev => ({ ...prev, locations: [...prev.locations, { key: item.key, name: item.name, type: item.type }] }));
      }
    }
    setSearchResults([]);
  };

  const removeTargetingItem = (id: string, type: 'interest' | 'location') => {
    if (type === 'interest') {
      setAdsConfig(prev => ({ ...prev, interests: prev.interests.filter(i => i.id !== id) }));
    } else {
      setAdsConfig(prev => ({ ...prev, locations: prev.locations.filter(l => l.key !== id) }));
    }
  };

  const renderAdPreview = () => (
    <div className={styles.previewColumn}>
       <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>Vista previa del anuncio</div>
          <div className={styles.fbPost}>
             <div className={styles.fbPostHeader}>
                <div className={styles.fbAvatar}>S</div>
                <div>
                   <div className={styles.fbName}>{selectedAccountIds.length > 0 ? socialAccounts.find(a => a.id === selectedAccountIds[0])?.pageName : "Tu Página"}</div>
                   <div className={styles.fbTime}>Publicidad · 🌐</div>
                </div>
             </div>
             <div className={styles.fbText}>
                {ad.title} {"\n\n"}
                {ad.description || "Welcome to this charming property..."} {"\n\n"}
                <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>{ad.campaign?.hashtags}</span>
             </div>
             <div className={styles.fbMediaGrid} style={(origin === 'reels' || origin === 'stories') ? { aspectRatio: "9/16", maxHeight: "600px" } : {}}>
                {ad.mediaUrl && (
                   ad.mediaType === 'video' ? (
                     <video src={ad.mediaUrl} controls className={styles.fbMediaItem} style={(origin === 'reels' || origin === 'stories') ? { objectFit: "cover", height: "100%" } : {}} />
                   ) : (
                     <img src={ad.mediaUrl} alt="Preview" className={styles.fbMediaItem} style={(origin === 'reels' || origin === 'stories') ? { objectFit: "cover", height: "100%" } : {}} />
                   )
                )}
             </div>
             <div className={styles.fbFooter}>
                <div style={{ fontSize: "0.85rem" }}>
                   <div style={{ fontWeight: 700 }}>{selectedAccountIds.length > 0 ? socialAccounts.find(a => a.id === selectedAccountIds[0])?.pageName : "Tu Página"}</div>
                   <div style={{ opacity: 0.7 }}>SML BSP es un innovador s...</div>
                </div>
                <button className={styles.fbCtaBtn}>
                   {adsConfig.ctaLabel === 'SEND_MESSAGE' && <span>💬 Mensaje</span>}
                   {adsConfig.ctaLabel === 'WHATSAPP' && <span>🟢 WhatsApp</span>}
                   {adsConfig.ctaLabel === 'LEARN_MORE' && <span>🔗 Ver más</span>}
                </button>
             </div>
          </div>
       </div>

       <div className={styles.estimatesCard}>
          <p className={styles.fieldLabel} style={{ marginBottom: "0.25rem" }}>Resultados diarios estimados</p>
          <p style={{ opacity: 0.6, fontSize: "0.8rem" }}>Impresiones estimadas</p>
          <p className={styles.estimateValue}>4.3 mil - 8 mil</p>
          <div className={styles.paymentSummary}>
             <span>Presupuesto</span>
             <span>${adsConfig.budgetAmount}.00 USD</span>
          </div>
          <div className={styles.paymentSummary} style={{ fontWeight: 700, border: "none", marginTop: 0 }}>
             <span>Total diario</span>
             <span>${adsConfig.budgetAmount}.00 USD</span>
          </div>
       </div>
    </div>
  );

  const renderFacebookAdsPro = () => (
    <div className={styles.adsTerminal}>
      <div className={styles.configColumn}>
        <div className={styles.metaCard}>
          <div className={styles.metaCardHeader}>
             <span className={styles.metaCardTitle}>Objetivo</span>
             <button className={styles.btnSecondary} style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }} onClick={() => setShowObjectiveModal(true)}>Cambiar</button>
          </div>
          <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>¿Qué resultados te gustaría obtener con este anuncio?</p>
          <div className={styles.objectivePill}>
             <span>⚡</span>
             <div>
                <div style={{ fontWeight: 700 }}>
                  {adsConfig.campaignObjective === 'OUTCOME_TRAFFIC' && "Tráfico - Clics e Visitas"}
                  {adsConfig.campaignObjective === 'MESSAGES' && "Interacción - Recibir más mensajes"}
                  {adsConfig.campaignObjective === 'OUTCOME_AWARENESS' && "Reconocimiento - Alcance de marca"}
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 400, opacity: 0.6 }}>Optimizado para obtener los mejores resultados al menor costo.</div>
             </div>
          </div>
        </div>

        {showObjectiveModal && (
          <div className={styles.modalOverlay} onClick={() => setShowObjectiveModal(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: 0 }}>Elige un Objetivo</h3>
              <div className={styles.objectiveGrid}>
                {[
                  { id: 'MESSAGES', name: 'Interacción (Mensajes)', desc: 'Ideal para WhatsApp o Messenger.', icon: '💬' },
                  { id: 'OUTCOME_TRAFFIC', name: 'Tráfico', desc: 'Envía personas a tu sitio web.', icon: '🔗' },
                  { id: 'OUTCOME_AWARENESS', name: 'Reconocimiento', desc: 'Llega a la mayor cantidad de personas.', icon: '📢' }
                ].map(obj => (
                  <div key={obj.id} className={`${styles.objectiveItem} ${adsConfig.campaignObjective === obj.id ? styles.objectiveItemSelected : ''}`} onClick={() => { setAdsConfig({...adsConfig, campaignObjective: obj.id}); setShowObjectiveModal(false); }}>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>{obj.icon}</span>
                      <div>
                        <div className={styles.objectiveName}>{obj.name}</div>
                        <div className={styles.objectiveDesc}>{obj.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className={styles.btnSecondary} onClick={() => setShowObjectiveModal(false)}>Cerrar</button>
            </div>
          </div>
        )}

        <div className={styles.metaCard}>
           <div className={styles.metaCardHeader}><span className={styles.metaCardTitle}>Contenido Multimedia</span></div>
           <p style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: "0.5rem" }}>El contenido gráfico o video principal de tu anuncio.</p>
           {ad.mediaUrl ? (
             <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-color)", width: "100%", height: "200px", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
               {ad.mediaType === 'video' ? (
                 <video src={ad.mediaUrl} controls style={{ maxWidth: "100%", maxHeight: "100%" }} />
               ) : (
                 <img src={ad.mediaUrl} alt="Ad Media" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
               )}
             </div>
           ) : (
             <div style={{ padding: "2rem", textAlign: "center", background: "var(--bg-primary)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)", opacity: 0.7 }}>
               No hay contenido multimedia asignado
             </div>
           )}
        </div>

        <div className={styles.metaCard}>
           <div className={styles.metaCardHeader}><span className={styles.metaCardTitle}>Texto del anuncio</span></div>
           <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>Publica un anuncio con el texto existente o agrega variaciones.</p>
           <textarea 
             className={styles.input} 
             style={{ minHeight: "120px", resize: "vertical" }}
             value={ad.description || ""}
             onChange={(e) => setAd({...ad, description: e.target.value})}
           />
           <div style={{ marginTop: "1rem" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Hashtags de la campaña</p>
              <input 
                type="text"
                className={styles.input} 
                placeholder="#Housing #RealEstate"
                value={ad.campaign?.hashtags || ""}
                onChange={(e) => setAd({...ad, campaign: {...ad.campaign, hashtags: e.target.value}})}
              />
           </div>
           
           <div className={styles.advantageCard} style={{ marginTop: "1rem" }}>
              <div style={{ flex: 1 }}>
                 <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Generación de texto Advantage+ ✨</p>
                 <p style={{ fontSize: "0.75rem", opacity: 0.6 }}>Nuestras herramientas de IA simplifican la generación de variaciones.</p>
              </div>
              <div 
                className={`${styles.toggleSwitch} ${adsConfig.advantageContent ? styles.toggleSwitchActive : ''}`}
                onClick={() => setAdsConfig({...adsConfig, advantageContent: !adsConfig.advantageContent})}
              >
                <div className={`${styles.toggleKnob} ${adsConfig.advantageContent ? styles.toggleKnobActive : ''}`} />
              </div>
           </div>
        </div>

        <div className={styles.metaCard}>
           <div className={styles.metaCardHeader}><span className={styles.metaCardTitle}>Botón</span></div>
           <select 
             className={styles.input} 
             value={adsConfig.ctaLabel}
             onChange={(e) => setAdsConfig({...adsConfig, ctaLabel: e.target.value})}
           >
              <option value="SEND_MESSAGE">Enviar mensaje</option>
              <option value="WHATSAPP">Enviar mensaje de WhatsApp</option>
              <option value="LEARN_MORE">Más información</option>
              <option value="BOOK_NOW">Reservar</option>
           </select>
        </div>

        <div className={styles.metaCard}>
           <div className={styles.metaCardHeader}><span className={styles.metaCardTitle}>Destino del Anuncio</span></div>
           <p style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: "0.5rem" }}>A dónde quieres enviar a las personas cuando hagan clic en el anuncio.</p>
           <input 
             type="url"
             className={styles.input} 
             placeholder="https://mi-inmobiliaria.com/propiedad"
             value={ad.linkUrl || ""}
             onChange={(e) => setAd({...ad, linkUrl: e.target.value})}
           />
        </div>

        <div className={styles.metaCard}>
           <div className={styles.metaCardHeader}><span className={styles.metaCardTitle}>Demografía (Housing)</span></div>
           <p style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "0.5rem" }}>Por política antidiscriminación de Meta, la demografía está bloqueada para anuncios inmobiliarios.</p>
           <div style={{ display: "flex", gap: "1rem", flexDirection: "row", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 120px" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Edad</p>
                <input type="text" className={styles.input} value="18 - 65+" disabled title="Bloqueado por Meta" style={{ opacity: 0.7, cursor: "not-allowed" }} />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Género</p>
                <input type="text" className={styles.input} value="Todos" disabled title="Bloqueado por Meta" style={{ opacity: 0.7, cursor: "not-allowed" }} />
              </div>
           </div>
        </div>

        <div className={styles.metaCard}>
           <div className={styles.metaCardHeader}><span className={styles.metaCardTitle}>Segmentación Geográfica y Detallada</span></div>
           <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>📍 Ubicaciones (Radio min 25km por ley)</p>
              <div className={styles.searchWrapper}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="text" className={styles.input} placeholder="Buscar ciudad (Ej. Miami, FL)..." onChange={(e) => handleSearch(e.target.value, "location")} style={{ flex: 1 }} />
                  <div style={{ width: "80px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", opacity: 0.8, fontSize: "0.85rem", fontWeight: 600 }}>
                    +25 km
                  </div>
                </div>
                {(isSearching && searchType === 'location') && <div className={styles.searchDropdown}><div className={styles.searchItem}><span className={styles.searchItemName}>Buscando...</span></div></div>}
                {(searchResults.length > 0 && searchType === 'location') && (
                  <div className={styles.searchDropdown}>
                    {searchResults.map((res: any, idx) => (
                      <div key={idx} className={styles.searchItem} onClick={() => selectTargetingItem(res)}>
                        <span className={styles.searchItemName}>{res.name}</span>
                        <span className={styles.searchItemDetail}>{res.region || res.country_name} · Ciudad</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.badgeGrid}>
                {adsConfig.locations.map(loc => (
                  <div key={loc.key} className={styles.targetingBadge}>
                    <span>📍 {loc.name}</span>
                    <span className={styles.badgeRemove} onClick={() => removeTargetingItem(loc.key, 'location')}>✕</span>
                  </div>
                ))}
              </div>
           </div>
           
           <div>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>🔥 Intereses (Comportamientos)</p>
              <p style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "0.5rem" }}>Sugeridos: Zillow, Real estate investing, Realtor, Mortgage.</p>
              <div className={styles.searchWrapper}>
                <input type="text" className={styles.input} placeholder="Buscar intereses..." onChange={(e) => handleSearch(e.target.value, "interest")} />
                {(isSearching && searchType === 'interest') && <div className={styles.searchDropdown}><div className={styles.searchItem}><span className={styles.searchItemName}>Buscando...</span></div></div>}
                {(searchResults.length > 0 && searchType === 'interest') && (
                  <div className={styles.searchDropdown}>
                    {searchResults.map((res: any, idx) => (
                      <div key={idx} className={styles.searchItem} onClick={() => selectTargetingItem(res)}>
                        <span className={styles.searchItemName}>{res.name}</span>
                        <span className={styles.searchItemDetail}>{res.topic} · Audiencia: {res.audience_size_lower_bound?.toLocaleString()} - {res.audience_size_upper_bound?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.badgeGrid}>
                {adsConfig.interests.map(int => (
                  <div key={int.id} className={styles.targetingBadge}>
                    <span>🔥 {int.name}</span>
                    <span className={styles.badgeRemove} onClick={() => removeTargetingItem(int.id, 'interest')}>✕</span>
                  </div>
                ))}
              </div>
           </div>
        </div>

        <div className={styles.metaCard}>
           <div className={styles.metaCardHeader}><span className={styles.metaCardTitle}>Presupuesto y Calendario</span></div>
           <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 140px" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Tipo de presupuesto</p>
                <select className={styles.input} value={adsConfig.budgetType} onChange={(e) => setAdsConfig({...adsConfig, budgetType: e.target.value as any})}>
                  <option value="daily">Presupuesto Diario</option>
                  <option value="total">Presupuesto Total</option>
                </select>
              </div>
              <div style={{ flex: "1 1 100px" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Monto (USD)</p>
                <input type="number" className={styles.input} value={adsConfig.budgetAmount} onChange={(e) => setAdsConfig({...adsConfig, budgetAmount: Number(e.target.value)})} min={1} />
              </div>
           </div>
           <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 140px" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Fecha de inicio</p>
                <input type="date" className={styles.input} value={adsConfig.startDate} onChange={(e) => setAdsConfig({...adsConfig, startDate: e.target.value})} />
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Fecha de fin (Opcional)</p>
                <input type="date" className={styles.input} value={adsConfig.endDate} onChange={(e) => setAdsConfig({...adsConfig, endDate: e.target.value})} />
              </div>
           </div>
        </div>
      </div>

      {renderAdPreview()}
    </div>
  );


  const getPostUrl = (res: any) => {
    if (res.status !== 'published' || !res.postId) return null;
    
    if (res.platform === 'facebook') {
      if (res.destination === 'ads') {
        const acc = socialAccounts.find(a => a.id === res.socialAccountId);
        return `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${acc?.adAccountId || ''}`;
      }
      return `https://facebook.com/${res.postId}`;
    }
    
    if (res.platform === 'instagram') {
      if (res.destination === 'reels') return `https://instagram.com/reels/${res.postId}/`;
      return `https://instagram.com/p/${res.postId}/`;
    }
    
    return null;
  };

  if (!ad) return <div className={styles.container}>Cargando...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.mainLayout} style={{ gridTemplateColumns: (step === 5 && publishType === 'ads' && platform === 'facebook') ? '64px 1fr' : undefined }}>
        <div className={styles.leftNav}>
          <div className={`${styles.navIconWrapper} ${step >= 1 ? styles.navIconActive : ''}`} onClick={() => setStep(1)}>
            <span>📱</span>
            <span className={styles.navIconLabel}>Red</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 2 ? styles.navIconActive : ''}`} onClick={() => setStep(2)}>
            <span>👤</span>
            <span className={styles.navIconLabel}>Titular</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 3 ? styles.navIconActive : ''}`} onClick={() => setStep(3)}>
            <span>📁</span>
            <span className={styles.navIconLabel}>Tipo</span>
          </div>
          <div className={`${styles.navIconWrapper} ${step >= 4 ? styles.navIconActive : ''}`} onClick={() => setStep(4)}>
            <span>🚩</span>
            <span className={styles.navIconLabel}>Cuenta</span>
          </div>
          {publishType === 'ads' && platform === 'facebook' && (
            <div className={`${styles.navIconWrapper} ${step >= 5 ? styles.navIconActive : ''}`} onClick={() => setStep(5)}>
              <span>⚙️</span>
              <span className={styles.navIconLabel}>Segmentar</span>
            </div>
          )}
          <div className={`${styles.navIconWrapper} ${step === (publishType === 'ads' && platform === 'facebook' ? 6 : 5) ? styles.navIconActive : ''}`} onClick={() => setStep(publishType === 'ads' && platform === 'facebook' ? 6 : 5)}>
            <span>🚀</span>
            <span className={styles.navIconLabel}>Publicar</span>
          </div>
        </div>

        <div className={styles.centerArea} style={{ 
          maxWidth: (step === 5 && publishType === 'ads' && platform === 'facebook') ? '100%' : '1200px',
          padding: (step === 5 && publishType === 'ads' && platform === 'facebook') ? '2rem 1.5rem' : '2rem'
        }}>
          <div className={styles.cardHeader} style={{ background: "transparent", border: "none" }}>
             <h2 className={styles.cardTitle} style={{ fontSize: "1.5rem" }}>
                {step === 5 && publishType === 'ads' && platform === 'facebook' ? "Configuración de Anuncio Pro" : "Publicar Creativo"}
             </h2>
             <Link href="/ads" className={styles.btnSecondary} style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}>← Volver</Link>
          </div>

          {error && <div style={{ background: "rgba(243, 66, 95, 0.1)", border: "1px solid #f3425f", color: "#f3425f", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>⚠️ {error}</div>}

          {publishResults ? (
            <div className={styles.configCard}>
              <div className={styles.cardHeader}><span className={styles.cardTitle}>Resultados</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {publishResults.map((res, i) => {
                  const acc = socialAccounts.find(a => a.id === res.socialAccountId);
                  const postUrl = getPostUrl(res);
                  return (
                    <div key={i} className={`${styles.resultCard} ${res.status === 'published' ? styles.resultSuccess : styles.resultError}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ fontSize: "1.5rem" }}>{res.status === 'published' ? "✅" : "❌"}</div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700 }}>{acc?.pageName || acc?.accountName || res.platform}</span>
                          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>{res.status === 'published' ? "¡Éxito!" : `Error: ${res.error}`}</span>
                        </div>
                      </div>
                      
                      {postUrl && (
                        <a href={postUrl} target="_blank" rel="noopener noreferrer" className={styles.btnView}>
                          Ver {res.destination === 'ads' ? 'en Ads Manager' : 'en Red Social'} 🔗
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
              <button className={styles.btnPrimary} style={{ marginTop: "1rem" }} onClick={() => router.push("/ads")}>Cerrar</button>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className={styles.configCard}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>1. Elige una Red Social</span></div>
                  {renderPlatformSelection()}
                </div>
              )}

              {step === 2 && (
                <div className={styles.configCard}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>2. Selecciona la Cuenta Titular</span></div>
                  {renderTitularSelection()}
                </div>
              )}

              {step === 3 && (
                <div className={styles.configCard}>
                   <div className={styles.cardHeader}><span className={styles.cardTitle}>3. Elige el Tipo de Publicación</span></div>
                   {renderConfigSection()}
                </div>
              )}

              {step === 4 && (
                <div className={styles.configCard}>
                   <div className={styles.cardHeader}><span className={styles.cardTitle}>4. Selecciona el Destino (Identidad)</span></div>
                   {renderIdentitySelection()}
                </div>
              )}

              {step === 5 && (
                publishType === 'ads' && platform === 'facebook' ? renderFacebookAdsPro() : (
                  <div className={styles.configCard}>
                    <div className={styles.cardHeader}><span className={styles.cardTitle}>Resumen de Publicación</span></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", marginTop: "0.5rem" }}>
                       <p>Anuncio: <b>{ad.title}</b></p>
                       <p>Plataforma: <b style={{ textTransform: "capitalize" }}>{platform}</b></p>
                       <p>Titular: <b>{selectedTitular}</b></p>
                       <p>Config: <b style={{ textTransform: "capitalize" }}>{publishType} ({origin || 'ads'})</b></p>
                       <p>Cuentas: <b>{selectedAccountIds.length} seleccionada(s)</b></p>
                    </div>
                  </div>
                )
              )}

              {step === 6 && (
                <div className={styles.configCard}>
                   <div className={styles.cardHeader}><span className={styles.cardTitle}>Confirmación Final</span></div>
                   <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", marginTop: "0.5rem" }}>
                      <p>Anuncio: <b>{ad.title}</b></p>
                      <p>Presupuesto: <b>${adsConfig.budgetAmount} USD / día</b></p>
                      <p>Segmentación: <b>Configurada</b></p>
                   </div>
                </div>
              )}
            </>
          )}
        </div>

        {!(step === 5 && publishType === 'ads' && platform === 'facebook') && (
          <div className={styles.rightSidebar}>
            <div className={styles.audienceGaugeCard}>
              <h3 className={styles.audienceGaugeTitle}>AUDIENCIA ESTIMADA</h3>
              <div className={styles.gaugeWrapper}><div className={styles.gaugeIndicator} style={{ left: `${getAudienceEstimate()}%` }} /></div>
              <div className={styles.gaugeLabels}><span>Específico</span><span>Óptimo</span><span>Amplio</span></div>
            </div>
            <div className={styles.configCard} style={{ background: "transparent", borderStyle: "dashed", padding: "1rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, opacity: 0.6 }}>RESUMEN DE COSTO</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>Gratis (API Directa)</div>
            </div>
          </div>
        )}
      </div>

      {!publishResults && (
        <div className={styles.bottomBar} style={{ position: 'sticky', bottom: 0, zIndex: 100 }}>
          <button type="button" className={styles.btnSecondary} onClick={() => step === 1 ? router.push("/ads") : handlePrevious()}>{step === 1 ? "Cancelar" : "Anterior"}</button>
          {(step < (publishType === 'ads' && platform === 'facebook' ? 6 : 5)) ? (
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
