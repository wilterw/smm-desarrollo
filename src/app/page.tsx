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
      {/* Navbar superior para visibilidad de links legales para bots de Google */}
      <nav className={styles.navbar}>
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className={styles.navLink}>
          Política de Privacidad
        </a>
        <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.navLink}>
          Condiciones de Uso
        </a>
      </nav>

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
          
          <a 
            href="https://wa.me/34652436599?text=Hola,%20deseo%20m%C3%A1s%20informaci%C3%B3n%20sobre%20SMM" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.whatsappBtn}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Más Información
          </a>
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
