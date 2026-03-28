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
            Recopilamos información necesaria para la gestión técnica y operativa de sus campañas publicitarias en:
          </p>
          <ul>
            <li>Facebook</li>
            <li>Instagram</li>
            <li>YouTube</li>
          </ul>
          <p>
            Esto incluye datos de perfil público, tokens de acceso (encriptados) y métricas de rendimiento de anuncios 
            proporcionadas a través de las APIs oficiales de dichas plataformas.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Uso de la Información</h2>
          <p>La información recopilada se utiliza exclusivamente para:</p>
          <ul>
            <li>Gestionar y optimizar la publicación de sus contenidos y anuncios.</li>
            <li>Generar informes detallados de rendimiento y ROI.</li>
            <li>Proporcionar soporte técnico y mejorar la experiencia del usuario.</li>
          </ul>
          <p>No utilizamos sus datos para fines distintos a la funcionalidad principal de la herramienta SMM.</p>
        </section>

        <section className={styles.section}>
          <h2>3. Protección y Seguridad</h2>
          <p>
            Implementamos medidas de seguridad técnicas y organizativas de nivel empresarial para proteger sus datos 
            contra el acceso no autorizado, la alteración o la pérdida. Sus credenciales de plataforma se almacenan 
            utilizando estándares de cifrado avanzados.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Sus Derechos</h2>
          <p>
            Como usuario, usted tiene derecho a acceder, rectificar o solicitar la eliminación de sus datos personales. 
            Puede revocar el acceso de la aplicación a sus cuentas sociales en cualquier momento desde la configuración 
            de seguridad de cada plataforma o desde nuestro panel de ajustes.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Contacto</h2>
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
