import Image from "next/image";
import styles from "./TermsOfService.module.css";

export default function TermsOfServicePage() {
  const lastUpdated = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={styles.container}>
      <div className={`glass-panel ${styles.content}`}>
        <div className={styles.logoHeader}>
          <Image src="/images/logo-econos.png" alt="Econos" width={240} height={75} className={styles.logo} priority />
          <div className={styles.headerDivider}></div>
          <Image src="/images/logo-smm.png" alt="SMM" width={150} height={60} className={styles.logo} priority />
        </div>
        
        <h1 className={styles.title}>Condiciones de Uso</h1>
        <p className={styles.lastUpdated}>Última actualización: {lastUpdated}</p>

        <section className={styles.section}>
          <p>
            Al acceder y utilizar la plataforma <strong>Social Media Manager (SMM)</strong> de Econos, usted acepta cumplir con 
            los siguientes términos y condiciones. Esta herramienta está diseñada para facilitar la gestión publicitaria y 
            la publicación de contenidos en redes sociales de manera automatizada y profesional.
          </p>
        </section>

        <section className={styles.section}>
          <h2>1. Integración con Meta (Facebook e Instagram)</h2>
          <p>
            Nuestra aplicación utiliza la API de Meta para gestionar anuncios y publicaciones. Al vincular su cuenta, 
            usted acepta que:
          </p>
          <ul>
            <li>La plataforma acceda a sus páginas de Facebook y cuentas comerciales de Instagram para realizar publicaciones autorizadas.</li>
            <li>SMM gestione sus Cuentas Publicitarias para la creación, monitorización y optimización de campañas.</li>
            <li>El uso de los datos se rige por las <strong>Políticas de la Plataforma Meta</strong> y los <strong>Términos de Servicio de Meta</strong>.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. Integración con Google (YouTube)</h2>
          <p>
            SMM se integra con los <strong>Servicios de API de YouTube</strong> para permitir la subida de videos y gestión de contenido. 
            Al utilizar estas funciones:
          </p>
          <ul>
            <li>Usted acepta quedar vinculado por los <strong>Términos de Servicio de YouTube</strong> (disponibles en <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent-primary)', textDecoration: 'underline'}}>www.youtube.com/t/terms</a>).</li>
            <li>Reconoce que nuestra aplicación accede a su cuenta de Google para subir videos y Shorts en su nombre según sus instrucciones.</li>
            <li>Puede revocar el acceso de SMM a través de la página de configuración de seguridad de Google (<a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent-primary)', textDecoration: 'underline'}}>security.google.com/settings/security/permissions</a>).</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Responsabilidad del Contenido</h2>
          <p>
            El usuario es el único responsable de la legalidad, veracidad y calidad de los contenidos (imágenes, videos, textos) 
            publicados a través de SMM. Econos no se hace responsable de las infracciones de derechos de autor o políticas 
            de contenido de terceros realizadas por el usuario.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Privacidad y Datos</h2>
          <p>
            El tratamiento de los datos personales y de las métricas obtenidas se rige por nuestra <strong>Política de Privacidad</strong>. 
            No compartimos información confidencial de sus campañas con terceros ajenos a la operativa técnica del servicio.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Limitación de Responsabilidad</h2>
          <p>
            Econos se esfuerza por mantener la plataforma operativa el 100% del tiempo, pero no garantiza la ausencia de interrupciones 
            técnicas debidas a cambios en las APIs de terceros (Meta, Google) o mantenimiento del sistema.
          </p>
        </section>

        <div className={styles.footer}>
          &copy; {new Date().getFullYear()} Econos. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
