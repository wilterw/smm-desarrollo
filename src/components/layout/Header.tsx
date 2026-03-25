"use client";

import { signOut, useSession } from "next-auth/react";
import styles from "./Header.module.css";
import { usePathname } from "next/navigation";

type HeaderProps = {
  onMenuToggle?: () => void;
};

export function Header({ onMenuToggle }: HeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    const segments: Record<string, string> = {
      campaigns: "Campañas",
      ads: "Anuncios",
      settings: "Configuración",
      admin: "Administración",
    };
    const segment = pathname.split("/")[1];
    return segments[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {onMenuToggle && (
          <button className={styles.menuBtn} onClick={onMenuToggle} aria-label="Toggle menu">
            <span className={styles.menuIcon}>☰</span>
          </button>
        )}
        <h1 className={styles.title}>{getPageTitle()}</h1>
      </div>
      
      <div className={styles.actions}>
        <button 
          className={styles.profileBtn}
          onClick={() => signOut()}
          title="Cerrar sesión"
        >
          <div className={styles.avatar}>
            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <span className={styles.logoutText}>Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
