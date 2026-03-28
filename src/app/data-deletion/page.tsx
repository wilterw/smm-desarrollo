import Image from "next/image";
import Link from "next/link";
import styles from "./DataDeletion.module.css";

export default function DataDeletionPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logoHeader}>
          <Image src="/images/logo-econos.png" alt="Econos" width={240} height={75} className={styles.logo} priority />
          <div className={styles.headerDivider}></div>
          <Image src="/images/logo-smm.png" alt="SMM" width={150} height={60} className={styles.logo} priority />
        </div>
        
        <h1 className={styles.title}>Instrucciones de Eliminación de Datos</h1>
        <p className={styles.subtitle}>
          En cumplimiento con las políticas de Meta para la gestión de datos vinculados, 
          proporcionamos esta guía paso a paso para revocar el acceso y solicitar el borrado de tus datos.
        </p>

        <section className={styles.section}>
          <h2>Proceso de Desvinculación</h2>
          <div className={styles.instructionList}>
            <div className={styles.instructionItem}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.text}>
                <h4>Accede a tu cuenta de Facebook</h4>
                <p>Inicia sesión y dirígete a la sección de <strong>"Configuración y Privacidad"</strong> en el menú principal.</p>
              </div>
            </div>
            
            <div className={styles.instructionItem}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.text}>
                <h4>Aplicaciones y sitios web</h4>
                <p>En el menú de configuración, localiza y haz clic en <strong>"Aplicaciones y sitios web"</strong>.</p>
              </div>
            </div>

            <div className={styles.instructionItem}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.text}>
                <h4>Eliminar Econos SMM</h4>
                <p>Busca <strong>"Econos SMM"</strong> en la lista, selecciónala y haz clic en el botón <strong>"Eliminar"</strong>.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Borrado Automático</h2>
          <div className={styles.callbackInfo}>
            <h3>
              <span>🛡️</span> Data Deletion Callback
            </h3>
            <p>
              Contamos con un sistema de respuesta automática (Callback). 
              En el momento en que confirmes la eliminación en Facebook, Meta nos enviará una notificación cifrada 
              y nuestros servidores procederán de inmediato a <strong>borrar permanentemente</strong> tus tokens 
              de acceso y configuraciones de cuenta social de nuestra base de datos sincronizada.
            </p>
          </div>
        </section>

        <div className={styles.footer}>
          <div className={styles.contactInfo}>
            <p>¿Necesitas ayuda adicional o borrado manual? Contáctanos:</p>
            <strong>soporte@econos.es</strong>
          </div>

          <div className={styles.legalLinks}>
            <Link href="/privacy-policy" className={styles.legalLink}>Política de Privacidad</Link>
            <Link href="/login" className={styles.legalLink}>Volver al Inicio</Link>
          </div>

          <div className={styles.copyright}>
            &copy; {new Date().getFullYear()} Econos. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}
