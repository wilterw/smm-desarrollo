import Image from "next/image";
import styles from "./PrivacyPolicy.module.css";

export default function PrivacyPolicyPage() {
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
        
        <h1 className={styles.title}>Política de Privacidad</h1>
        <p className={styles.lastUpdated}>Última actualización: {lastUpdated}</p>

        <section className={styles.section}>
          <p>
            En <strong>Econos</strong>, con sede en Málaga, España, nos tomamos muy en serio la privacidad de sus datos. 
            Esta Política de Privacidad describe cómo recopilamos, utilizamos y protegemos su información al utilizar 
            nuestra plataforma Social Media Manager (SMM).
          </p>
        </section>

        <section className={styles.section}>
          <h2>1. Información que recopilamos</h2>
          <p>
            Recopilamos información necesaria para la gestión técnica y operativa de sus campañas publicitarias y publicaciones en:
          </p>
          <ul>
            <li>Facebook e Instagram (a través de Meta Graph API)</li>
            <li>YouTube (a través de YouTube API Services)</li>
          </ul>
          <p>
            Esto incluye datos de perfil público, tokens de acceso (encriptados) y métricas de rendimiento de anuncios 
            proporcionadas a través de las APIs oficiales de dichas plataformas.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Uso de los Servicios de la API de YouTube</h2>
          <p>
            Nuestra aplicación utiliza los <strong>Servicios de la API de YouTube</strong> para permitir la carga y gestión de contenido de video directamente en su canal de YouTube. Al utilizar nuestra herramienta, usted también acepta estar sujeto a los <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={{color: "var(--accent-primary)", textDecoration: "underline"}}>Términos de Servicio de YouTube</a>.
          </p>
          <p>
            Además del uso de nuestros propios datos, nuestra aplicación procesa datos obtenidos a través de la API de YouTube. Puede consultar la <strong>Política de Privacidad de Google</strong> en el siguiente enlace: <a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" style={{color: "var(--accent-primary)", textDecoration: "underline"}}>http://www.google.com/policies/privacy</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Gestión de Datos y Revocación de Acceso</h2>
          <p>
            Usted puede revocar el acceso de nuestra aplicación a sus datos de Google en cualquier momento a través de la página de <strong>Configuración de Seguridad de Google</strong>: 
            <br />
            <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer" style={{color: "var(--accent-primary)", textDecoration: "underline"}}>https://security.google.com/settings/security/permissions</a>.
          </p>
          <p>
            Si desea que eliminemos los datos almacenados en nuestros servidores relacionados con su cuenta de YouTube, puede desconectar su cuenta desde el panel de ajustes de SMM o contactarnos directamente.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Uso de la Información</h2>
          <p>La información recopilada se utiliza exclusivamente para:</p>
          <ul>
            <li>Gestionar y optimizar la publicación de sus contenidos y anuncios.</li>
            <li>Generar informes detallados de rendimiento y ROI.</li>
            <li>Proporcionar soporte técnico y mejorar la experiencia del usuario.</li>
          </ul>
          <p>No compartimos, vendemos ni utilizamos sus datos para fines distintos a la funcionalidad principal de la herramienta SMM.</p>
        </section>

        <section className={styles.section}>
          <h2>5. Protección y Seguridad</h2>
          <p>
            Implementamos medidas de seguridad técnicas y organizativas de nivel empresarial para proteger sus datos 
            contra el acceso no autorizado, la alteración o la pérdida. Sus credenciales de plataforma se almacenan 
            utilizando estándares de cifrado avanzados (AES-256).
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Contacto</h2>
          <p>
            Para cualquier consulta relacionada con esta política o el tratamiento de sus datos, puede contactarnos en 
            nuestra sede en Málaga o a través de los canales de soporte habilitados en la plataforma.
          </p>
        </section>

        <div className={styles.footer}>
          &copy; {new Date().getFullYear()} Econos. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
