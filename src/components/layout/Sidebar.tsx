"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./Sidebar.module.css";
import { useSession } from "next-auth/react";

const navItems = [
  { name: "Dashboard", href: "/", icon: "📊" },
  { name: "Campañas", href: "/campaigns", icon: "🚀" },
  { name: "Anuncios", href: "/ads", icon: "🖼️" },
  { name: "Cuentas Sociales", href: "/settings/accounts", icon: "🔗" },
];

const adminItems = [
  { name: "Usuarios", href: "/admin/users", icon: "👥" },
  { name: "Permisos", href: "/admin/permissions", icon: "🔑" },
];

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN";

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`
      ${styles.sidebar} 
      ${isOpen ? styles.sidebarOpen : ""} 
      ${isCollapsed ? styles.sidebarCollapsed : ""}
    `}>
      <div className={styles.logoContainer}>
        {onToggleCollapse && (
          <button 
            className={styles.sidebarToggleBtn} 
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? "→" : "←"}
          </button>
        )}
        
        {isCollapsed ? (
          <Image src="/images/solo smm.png" alt="Icon" width={40} height={40} className={styles.iconLogo} />
        ) : (
          <Image src="/images/logo-smm.png" alt="SMM Logo" width={180} height={50} className={styles.smmLogo} priority />
        )}
        
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        )}
      </div>
      
      <nav className={styles.nav}>
        {!isCollapsed && <div className={styles.navSection}>General</div>}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const isDashActive = item.href === "/" && pathname === "/";
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`${styles.navItem} ${isActive || isDashActive ? styles.active : ""}`}
              onClick={handleNavClick}
              title={isCollapsed ? item.name : ""}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            {!isCollapsed && (
              <div className={styles.navSection} style={{ marginTop: "1.5rem" }}>
                Administración
              </div>
            )}
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                  onClick={handleNavClick}
                  title={isCollapsed ? item.name : ""}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className={styles.footer}>
        {!isCollapsed && (
          <div className={styles.legalLinks}>
            <Link href="/privacy-policy" className={styles.legalLink} onClick={handleNavClick}>
              Política de Privacidad
            </Link>
          </div>
        )}
        <div className={styles.userInfo}>
          <div className={styles.footerAvatar}>
            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U"}
          </div>
          {!isCollapsed && (
            <div>
              <div className={styles.footerName}>
                {session?.user?.name || "Usuario"}
              </div>
              <div className={styles.footerEmail}>{session?.user?.email}</div>
            </div>
          )}
        </div>

        {!isCollapsed && <div className={styles.versionTag}>V2.9</div>}
      </div>
    </aside>
  );
}
