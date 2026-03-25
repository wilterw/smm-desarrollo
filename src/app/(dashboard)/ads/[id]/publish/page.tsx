"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./Publish.module.css";

type AdsConfig = {
  dailyBudget: number;
  country: string;
  state: string;
  ageMin: number;
  ageMax: number;
  gender: string;
  interests: string;
};

type Destination = "feed" | "fanpage" | "both" | "reels" | "stories" | "shorts" | "ads";

export default function PublishWizard({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [ad, setAd] = useState<any>(null);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  
  // Selections
  const [platform, setPlatform] = useState<"facebook" | "instagram" | "youtube" | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [adsConfig, setAdsConfig] = useState<AdsConfig>({
    dailyBudget: 10,
    country: "US",
    state: "",
    ageMin: 18,
    ageMax: 65,
    gender: "all",
    interests: ""
  });
  
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

  const currentAccount = platform ? socialAccounts.find(a => a.provider === platform) : null;
  const isConnected = !!currentAccount;

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
    if (step === 1 && !platform) return alert("Selecciona una plataforma");
    if (step === 1 && !isConnected) return alert("Debes conectar la plataforma seleccionada");
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
          destinations: [{
            platform,
            destination,
            adsConfig: destination === "ads" ? adsConfig : null
          }]
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
      <h3 className={styles.sectionTitle}>Configuración tipo Ads Manager</h3>
      
      <div className={styles.grid2} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Presupuesto Diario (USD)</label>
          <input className={styles.input} type="number" value={adsConfig.dailyBudget} onChange={(e) => setAdsConfig({...adsConfig, dailyBudget: Number(e.target.value)})} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>País / Región</label>
          <select className={styles.select} value={adsConfig.country} onChange={(e) => setAdsConfig({...adsConfig, country: e.target.value})}>
            <option value="US">Estados Unidos</option>
            <option value="MX">México</option>
            <option value="ES">España</option>
            <option value="CO">Colombia</option>
            <option value="AR">Argentina</option>
          </select>
        </div>
      </div>

      <div className={styles.grid2} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Edad Mínima</label>
          <input className={styles.input} type="number" value={adsConfig.ageMin} onChange={(e) => setAdsConfig({...adsConfig, ageMin: Number(e.target.value)})} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Edad Máxima</label>
          <input className={styles.input} type="number" value={adsConfig.ageMax} onChange={(e) => setAdsConfig({...adsConfig, ageMax: Number(e.target.value)})} />
        </div>
      </div>

      <div className={styles.formGroup} style={{ marginBottom: "1.5rem" }}>
        <label className={styles.label}>Género</label>
        <select className={styles.select} value={adsConfig.gender} onChange={(e) => setAdsConfig({...adsConfig, gender: e.target.value})}>
          <option value="all">Todos</option>
          <option value="male">Hombres</option>
          <option value="female">Mujeres</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Intereses (separados por coma)</label>
        <textarea className={styles.input} placeholder="Ej: marketing, negocios, tecnología" value={adsConfig.interests} onChange={(e) => setAdsConfig({...adsConfig, interests: e.target.value})} />
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
        {/* STEP 1: PLATFORM */}
        {step === 1 && (
          <div>
            <h3 className={styles.sectionTitle}>Selecciona la plataforma</h3>
            <div className={styles.platformGrid}>
              <div className={`${styles.platformCard} ${platform === "facebook" ? styles.platformCardSelected : ""}`} onClick={() => setPlatform("facebook")}>
                <div className={styles.platformIcon}>📘</div>
                <div className={styles.platformName}>Facebook</div>
                <div className={styles.platformStatus}>
                  {socialAccounts.find(a => a.provider==="facebook")?.accountName || "No conectado"}
                </div>
              </div>
              <div className={`${styles.platformCard} ${platform === "instagram" ? styles.platformCardSelected : ""}`} onClick={() => setPlatform("instagram")}>
                <div className={styles.platformIcon}>📷</div>
                <div className={styles.platformName}>Instagram</div>
                <div className={styles.platformStatus}>
                  {socialAccounts.find(a => a.provider==="facebook")?.igAccountId ? "Conectado" : "Requiere FB"}
                </div>
              </div>
              <div className={`${styles.platformCard} ${platform === "youtube" ? styles.platformCardSelected : ""}`} onClick={() => setPlatform("youtube")}>
                <div className={styles.platformIcon}>🎬</div>
                <div className={styles.platformName}>YouTube</div>
                <div className={styles.platformStatus}>
                  {socialAccounts.find(a => a.provider==="youtube")?.accountName || "No conectado"}
                </div>
              </div>
            </div>

            {platform && !isConnected && (
              <div className={styles.connectAlert}>
                <span>Esta plataforma no está conectada. Inicia sesión para continuar.</span>
                <button type="button" className={styles.btnConnect} onClick={() => handleConnect(platform === "instagram" ? "facebook" : platform)}>
                  Conectar {platform}
                </button>
              </div>
            )}
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
              <span className={styles.summaryLabel}>Plataforma</span>
              <span className={styles.summaryValue} style={{ textTransform: "capitalize" }}>{platform}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Destino</span>
              <span className={styles.summaryValue} style={{ textTransform: "capitalize" }}>{destination}</span>
            </div>
            {destination === "ads" && (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Inversión Diaria</span>
                <span className={styles.summaryValue}>${adsConfig.dailyBudget} USD</span>
              </div>
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
