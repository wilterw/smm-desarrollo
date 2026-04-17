"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./Sidebar.module.css";
import { useSession } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/", iconSrc: "/images/dashboard.jpg" },
  { 
    name: "Campañas", 
    href: "/campaigns", 
    iconSrc: "/images/campañas.jpg",
    children: [
      { name: "Campañas Simples", href: "/campaigns" },
      { name: "Campañas Dinámicas", href: "/real-estate" },
    ]
  },
  { name: "Anuncios", href: "/ads", iconSrc: "/images/anuncios.jpg" },
  { name: "Cuentas Sociales", href: "/settings/accounts", iconSrc: null, iconEmoji: "🔗" },
];

const adminItems = [
  { name: "Usuarios", href: "/admin/users", iconSrc: null, iconEmoji: "👥" },
  { name: "Permisos", href: "/admin/permissions", iconSrc: null, iconEmoji: "🔑" },
];

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN";

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const toggleMenu = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const renderIcon = (item: { iconSrc?: string | null; iconEmoji?: string }) => {
    if (item.iconSrc) {
      return (
        <Image 
          src={item.iconSrc} 
          alt="" 
          width={22} 
          height={22} 
          className={styles.navIconImg}
        />
      );
    }
    return <span>{item.iconEmoji}</span>;
  };

  return (
    <aside className={`
      ${styles.sidebar} 
      ${isOpen ? styles.sidebarOpen : ""}
    `}>
      <div className={styles.logoContainer}>
        <div className={styles.logoCollapsed}>
          <Image src="/images/solo smm.png" alt="Icon" width={40} height={40} className={styles.iconLogo} />
        </div>
        <div className={styles.logoExpanded}>
          <Image src="/images/logo-smm.png" alt="SMM Logo" width={180} height={50} className={styles.smmLogo} priority />
        </div>
        
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        )}
      </div>
      
      <nav className={styles.nav}>
        <div className={styles.navSection}>General</div>
        {navItems.map((item) => {
          if (item.children) {
            const isParentActive = item.children.some(child => pathname === child.href || pathname.startsWith(`${child.href}/`)) || pathname === item.href;
            const isMenuOpen = openMenus[item.name] !== undefined ? openMenus[item.name] : isParentActive;

            return (
              <div key={item.name} className={styles.navGroup}>
                <div 
                  className={`${styles.navItem} ${isParentActive && !isMenuOpen ? styles.active : ""} ${styles.navParent}`}
                  onClick={(e) => toggleMenu(item.name, e)}
                  style={{ cursor: "pointer" }}
                >
                  <span className={styles.navIcon}>{renderIcon(item)}</span>
                  <span className={styles.navLabel} style={{ flex: 1 }}>{item.name}</span>
                  <span className={`${styles.chevron} ${isMenuOpen ? styles.chevronOpen : ""}`}>
                    ▼
                  </span>
                </div>
                {isMenuOpen && (
                  <div className={styles.navChildren}>
                    {item.children.map(child => {
                      // /campaigns y /real-estate checks
                      const isActive = child.href === "/campaigns" 
                        ? pathname === "/campaigns" || pathname.startsWith("/campaigns/")
                        : pathname === child.href || pathname.startsWith(`${child.href}/`);
                      return (
                        <Link 
                          key={child.href} 
                          href={child.href}
                          className={`${styles.navChildItem} ${isActive ? styles.activeChild : ""}`}
                          onClick={handleNavClick}
                        >
                          <span className={styles.navChildDot}></span>
                          <span className={styles.navChildLabel}>{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const isDashActive = item.href === "/" && pathname === "/";
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`${styles.navItem} ${isActive || isDashActive ? styles.active : ""}`}
              onClick={handleNavClick}
              title={item.name}
            >
              <span className={styles.navIcon}>{renderIcon(item)}</span>
              <span className={styles.navLabel}>{item.name}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className={styles.navSection} style={{ marginTop: "1.5rem" }}>
              Administración
            </div>
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                  onClick={handleNavClick}
                  title={item.name}
                >
                  <span className={styles.navIcon}>{renderIcon(item)}</span>
                  <span className={styles.navLabel}>{item.name}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className={styles.footer}>
        <div className={styles.legalLinks}>
          <Link href="/privacy-policy" className={styles.legalLink} onClick={handleNavClick}>
            Política de Privacidad
          </Link>
        </div>
        <div className={styles.userInfo}>
          <div className={styles.footerAvatar}>
            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className={styles.userDetails}>
            <div className={styles.footerName}>
              {session?.user?.name || "Usuario"}
            </div>
            <div className={styles.footerEmail}>{session?.user?.email}</div>
          </div>
        </div>

        <div className={styles.versionTag}>V2.9</div>
      </div>
    </aside>
  );
}
