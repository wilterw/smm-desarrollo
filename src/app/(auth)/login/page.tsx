"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import styles from "./Login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh(); // Refresh to update server components with session state
    }
  };

  return (
    <div className={styles.container}>
      <div className={`glass-panel ${styles.card}`}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Image src="/images/logo-econos.png" alt="Econos" width={160} height={50} className={styles.logo} priority />
            <div className={styles.divider}></div>
            <Image src="/images/logo-smm.png" alt="SMM" width={100} height={40} className={styles.logo} priority />
          </div>
          <p className={styles.subtitle}>Inicia sesión para gestionar tus campañas</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Correo Electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="admin@example.com"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Iniciando sesión..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
