"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./Accounts.module.css";

type SocialAccount = {
  id: string;
  provider: string;
  providerAccountId: string;
  accountName: string | null;
  pageName: string | null;
  expiresAt: string | null;
};

type UserLimits = {
  maxFacebookAccounts: number;
  maxInstagramAccounts: number;
  maxYouTubeAccounts: number;
};

const providers = [
  {
    key: "facebook",
    name: "Facebook",
    desc: "Publica en Pages y accede a Instagram",
    icon: "📘",
    iconClass: styles.providerFb,
    btnClass: styles.connectBtnFb,
  },
  {
    key: "instagram",
    name: "Instagram",
    desc: "Requiere cuenta de Facebook vinculada",
    icon: "📷",
    iconClass: styles.providerIg,
    btnClass: styles.connectBtnIg,
  },
  {
    key: "youtube",
    name: "YouTube",
    desc: "Sube videos directamente a tu canal",
    icon: "🎬",
    iconClass: styles.providerYt,
    btnClass: styles.connectBtnYt,
  },
];

export default function AccountsPage() {
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const [accRes, limitRes] = await Promise.all([
        fetch("/api/social/accounts"),
        fetch("/api/users/me")
      ]);
      
      if (accRes.ok) setAccounts(await accRes.json());
      if (limitRes.ok) setLimits(await limitRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleConnect = async (provider: string) => {
    try {
      const connectProvider = provider === "instagram" ? "facebook" : provider;
      const res = await fetch(`/api/social/connect?provider=${connectProvider}`);
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        const data = await res.json();
        alert(data.error || "Error al conectar");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const handleDisconnect = async (providerAccountId: string, provider: string) => {
    if (!confirm("¿Desconectar este titular? Se eliminarán todas las Fanpages asociadas.")) return;
    try {
      await fetch("/api/social/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAccountId, provider }),
      });
      await fetchAccounts();
    } catch {
      alert("Error al desconectar");
    }
  };

  const getPlatformData = (provider: string) => {
    const platformAccounts = accounts.filter(a => a.provider === provider);
    
    // Group by providerAccountId (Titular)
    const titularsMap = new Map();
    platformAccounts.forEach(acc => {
      if (!titularsMap.has(acc.providerAccountId)) {
        titularsMap.set(acc.providerAccountId, acc);
      }
    });
    const uniqueTitulars = Array.from(titularsMap.values());

    let limit = 1;
    if (limits) {
      if (provider === "facebook") limit = limits.maxFacebookAccounts;
      else if (provider === "instagram") limit = limits.maxInstagramAccounts;
      else if (provider === "youtube") limit = limits.maxYouTubeAccounts;
    }
    return {
      accounts: uniqueTitulars,
      limit,
      remaining: limit - uniqueTitulars.length
    };
  };

  if (loading) return <div>Cargando cuentas...</div>;

  return (
    <div className={styles.container}>
      <div>
        <h2 className={styles.title}>Cuentas Sociales</h2>
        <p className={styles.subtitle}>Conecta tus redes sociales para publicar anuncios directamente desde SMM.</p>
      </div>

      {successParam && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          ✅ Cuenta conectada exitosamente.
        </div>
      )}
      {errorParam && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          ❌ Error: {decodeURIComponent(errorParam)}
        </div>
      )}

      <div className={styles.grid}>
        {providers.map(p => {
          const { accounts: platformTitulars, limit, remaining } = getPlatformData(p.key);
          const canConnect = remaining > 0;

          return (
            <div key={p.key} className={`glass-panel ${styles.providerCard}`}>
              <div className={styles.providerHeader}>
                <div className={`${styles.providerIcon} ${p.iconClass}`}>
                  {p.icon}
                </div>
                <div>
                  <div className={styles.providerName}>{p.name}</div>
                  <div className={styles.providerDesc}>{p.desc}</div>
                </div>
              </div>

              <div className={styles.limitInfo}>
                Capacidad: <strong>{platformTitulars.length} / {limit}</strong>
              </div>

              <div className={styles.accountsList}>
                {platformTitulars.length > 0 ? (
                  platformTitulars.map(acc => (
                    <div key={acc.id} className={styles.accountItem}>
                      <div className={styles.accountMain}>
                        <div className={styles.accountAvatar}>
                          {acc.accountName?.charAt(0) || "A"}
                        </div>
                        <div className={styles.accountDetails}>
                          <div className={styles.accountTitle}>{acc.accountName || "Titular"}</div>
                          {acc.expiresAt && (
                            <div className={styles.accountSubtitle}>
                              Expira: {new Date(acc.expiresAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <button 
                        className={styles.miniDisconnectBtn}
                        onClick={() => handleDisconnect(acc.providerAccountId, acc.provider)}
                      >
                        Desconectar
                      </button>
                    </div>
                  ))
                ) : (
                  <div className={styles.noAccounts}>Sin cuentas vinculadas</div>
                )}
              </div>

              <div className={styles.statusRow}>
                {canConnect ? (
                  <button
                    className={`${styles.connectBtn} ${p.btnClass}`}
                    onClick={() => handleConnect(p.key)}
                  >
                    + Vincular {p.name}
                  </button>
                ) : (
                  <div className={styles.limitReached}>
                    Límite alcanzado
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.infoBox}>
        <strong>💡</strong> Conecta tus redes sociales y concede los permisos necesarios para poder publicar directamente desde SMM.
      </div>
    </div>
  );
}
