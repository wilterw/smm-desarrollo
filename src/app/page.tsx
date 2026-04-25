import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import styles from "./Landing.module.css";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Si ya está logueado, redirigir al dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <div className={styles.logoContainer}>
          <Image src="/images/logo-econos.png" alt="Econos" width={220} height={70} className={styles.logo} priority />
          <div className={styles.divider}></div>
          <Image src="/images/logo-smm.png" alt="Social Media Manager IA" width={160} height={60} className={styles.logo} priority />
        </div>
        
        <h1 className={styles.title}>
          Automatiza tu presencia en redes sociales con Inteligencia Artificial
        </h1>
        
        <p className={styles.subtitle}>
          SMM (Social Media Manager IA) es la herramienta definitiva del ecosistema Digital Estate IA 
          para la gestión de anuncios y publicaciones orgánicas en Meta y Google.
        </p>
        
        <div className={styles.ctaGroup}>
          <Link href="/login" className={styles.loginBtn}>
            Acceder a la Plataforma
          </Link>
        </div>
      </header>

      <section className={styles.features}>
        <div className={`glass-panel ${styles.featureCard}`}>
          <span className={styles.featureIcon}>🚀</span>
          <h2 className={styles.featureTitle}>Gestión de Campañas</h2>
          <p className={styles.featureText}>
            Crea y optimiza campañas publicitarias en Facebook, Instagram y YouTube desde un único panel 
            centralizado con tecnología de IA.
          </p>
        </div>
        
        <div className={`glass-panel ${styles.featureCard}`}>
          <span className={styles.featureIcon}>🤖</span>
          <h2 className={styles.featureTitle}>Publicación Orgánica</h2>
          <p className={styles.featureText}>
            Automatiza tus publicaciones diarias y contenido en formato Shorts y Reels para mantener 
            tu audiencia activa sin esfuerzo manual.
          </p>
        </div>
        
        <div className={`glass-panel ${styles.featureCard}`}>
          <span className={styles.featureIcon}>📊</span>
          <h2 className={styles.featureTitle}>Análisis de ROI</h2>
          <p className={styles.featureText}>
            Visualiza el rendimiento de tus anuncios en tiempo real con métricas claras de clics, 
            alcance e impresiones integradas directamente de las APIs oficiales.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.legalLinks}>
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>
            Política de Privacidad
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>
            Condiciones de Uso
          </a>
        </div>
        
        <div className={styles.copyright}>
          &copy; {new Date().getFullYear()} Econos. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
