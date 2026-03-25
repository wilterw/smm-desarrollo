"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./Accounts.module.css";

type SocialAccount = {
  id: string;
  provider: string;
  providerAccountId: string;
  expiresAt: string | null;
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
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/accounts");
      if (res.ok) setAccounts(await res.json());
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

  const handleDisconnect = async (accountId: string) => {
    if (!confirm("¿Desconectar esta cuenta?")) return;
    try {
      await fetch("/api/social/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      await fetchAccounts();
    } catch {
      alert("Error al desconectar");
    }
  };

  const isConnected = (provider: string) => {
    if (provider === "instagram") {
      return accounts.some(a => a.provider === "facebook");
    }
    return accounts.some(a => a.provider === provider);
  };

  const getAccount = (provider: string) => {
    if (provider === "instagram") {
      return accounts.find(a => a.provider === "facebook");
    }
    return accounts.find(a => a.provider === provider);
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
          const connected = isConnected(p.key);
          const account = getAccount(p.key);

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

              <div className={styles.statusRow}>
                {connected ? (
                  <div className={styles.statusConnected}>
                    <span>●</span> Conectado
                  </div>
                ) : (
                  <div className={styles.statusDisconnected}>
                    <span>○</span> No conectado
                  </div>
                )}

                {connected ? (
                  <button
                    className={styles.disconnectBtn}
                    onClick={() => account && handleDisconnect(account.id)}
                  >
                    Desconectar
                  </button>
                ) : (
                  <button
                    className={`${styles.connectBtn} ${p.btnClass}`}
                    onClick={() => handleConnect(p.key)}
                  >
                    Conectar {p.name}
                  </button>
                )}
              </div>

              {connected && account?.expiresAt && (
                <div className={styles.expiresText}>
                  Token expira: {new Date(account.expiresAt).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.infoBox}>
        <strong>💡 Nota importante:</strong> Para conectar Facebook e Instagram necesitas una{" "}
        <strong>Meta Developer App</strong> con los permisos <code>pages_manage_posts</code> e{" "}
        <code>instagram_content_publish</code>. Para YouTube necesitas un proyecto en{" "}
        <strong>Google Cloud Console</strong> con la YouTube Data API v3 habilitada.
        <br /><br />
        Configura las credenciales en el archivo <code>.env</code> del proyecto.
      </div>
    </div>
  );
}
