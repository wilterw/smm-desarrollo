# PLAN DE MEJORAS SMM v1.0

> **INSTRUCCIONES PARA EL AGENTE:** Este archivo contiene el plan completo para implementar 11 fases de mejoras en el proyecto SMM. Cada fase debe ejecutarse secuencialmente: implementar → probar → solicitar aprobación del usuario → siguiente fase. NO avanzar a la siguiente fase sin aprobación explícita del usuario. Al finalizar todas las fases, preguntar al usuario qué versión colocar antes de subir.

---

## CONTEXTO DEL PROYECTO

### Stack Tecnológico
- **Framework:** Next.js 16.2.1 (App Router) con React 19.2.4
- **Base de datos:** SQLite via Prisma ORM 5.22
- **Auth:** NextAuth v4 con CredentialsProvider (JWT strategy)
- **Estilos:** CSS Modules + variables CSS personalizadas (NO TailwindCSS)
- **Lenguaje:** TypeScript
- **Node:** >=20.9.0

### Estructura del Proyecto
```
smm/
├── prisma/
│   ├── schema.prisma          # Modelos: User, Account, Session, SocialAccount, Campaign, Ad, Publication, AdBudget, etc.
│   ├── seed.ts                # Semilla con usuario admin@smm.com
│   └── dev.db                 # SQLite DB
├── public/
│   ├── favicon.png            # Favicon (168KB) ← USAR ESTE
│   ├── images/
│   │   ├── logo-smm.png       # Logo SMM usado en Sidebar
│   │   └── logo-econos.png    # Logo Econos usado en Header
│   └── uploads/               # Archivos subidos por usuario
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (Inter font, AuthProvider)
│   │   ├── globals.css        # Importa variables.css, clases globales
│   │   ├── (auth)/login/      # Página de login
│   │   ├── (dashboard)/       # Layout protegido con sidebar+header
│   │   │   ├── layout.tsx     # Server component que verifica session
│   │   │   ├── DashboardLayout.tsx  # Client layout con Sidebar+Header
│   │   │   ├── page.tsx       # Dashboard principal (KPIs, tracking, actividad)
│   │   │   ├── Dashboard.module.css
│   │   │   ├── campaigns/
│   │   │   │   ├── page.tsx   # Lista de campañas con modal de crear
│   │   │   │   └── Campaigns.module.css
│   │   │   ├── ads/
│   │   │   │   ├── page.tsx   # Lista de anuncios (cards con preview)
│   │   │   │   ├── Ads.module.css
│   │   │   │   ├── new/
│   │   │   │   │   ├── page.tsx      # Formulario crear anuncio con preview
│   │   │   │   │   └── AdForm.module.css
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Editar anuncio
│   │   │   │       └── publish/
│   │   │   │           ├── page.tsx  # Wizard de publicación (3-4 pasos)
│   │   │   │           └── Publish.module.css
│   │   │   ├── settings/accounts/
│   │   │   │   ├── page.tsx   # Conectar redes sociales (FB, IG, YT)
│   │   │   │   └── Accounts.module.css
│   │   │   └── admin/
│   │   │       ├── users/
│   │   │       │   ├── page.tsx      # Gestión de usuarios (CRUD + roles)
│   │   │       │   └── Users.module.css
│   │   │       └── permissions/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   │   ├── ads/
│   │   │   │   ├── route.ts          # GET (listar), POST (crear)
│   │   │   │   └── [id]/route.ts     # GET, PUT, DELETE individual
│   │   │   ├── campaigns/
│   │   │   │   ├── route.ts          # GET (listar), POST (crear)
│   │   │   │   └── [id]/             # Actualmente solo tiene subcarpetas
│   │   │   ├── social/
│   │   │   │   ├── connect/route.ts  # GET: genera OAuth URL para FB/YT
│   │   │   │   ├── callback/[provider]/route.ts  # GET: maneja callback OAuth
│   │   │   │   ├── accounts/         # GET/DELETE cuentas sociales
│   │   │   │   ├── insights/sync/    # Sincronizar métricas
│   │   │   │   └── data-deletion/    # Meta data deletion callback
│   │   │   ├── publish/              # POST: publicar en redes
│   │   │   ├── upload/               # POST: subir archivos multimedia
│   │   │   ├── users/
│   │   │   │   ├── route.ts          # GET/POST (admin)
│   │   │   │   └── [id]/route.ts     # PUT/DELETE (admin)
│   │   │   └── dashboard/            # GET: datos del dashboard
│   │   ├── privacy-policy/
│   │   └── data-deletion/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx           # Navegación lateral + logo + footer + user info
│   │   │   ├── Sidebar.module.css
│   │   │   ├── Header.tsx            # Header con título de página + logo Econos + logout
│   │   │   └── Header.module.css
│   │   └── providers/
│   │       └── AuthProvider.tsx       # SessionProvider wrapper
│   ├── lib/
│   │   ├── auth.ts                   # NextAuth config (CredentialsProvider, JWT, bcrypt)
│   │   ├── prisma.ts                 # Prisma client singleton
│   │   └── social/
│   │       ├── facebook.ts           # ⚠️ Usa v19.0 → DEBE SER v24.0
│   │       ├── instagram.ts          # Funciones para publicar en IG
│   │       └── youtube.ts            # Funciones para publicar en YT
│   ├── styles/
│   │   ├── variables.css             # Design tokens (colores Econos, radii, transitions)
│   │   └── globals.css               # Glassmorphism, utilidades, scrollbar
│   └── types/
│       └── next-auth.d.ts            # Tipos para session.user.id, role
└── .env                              # DATABASE_URL, NEXTAUTH_*, FACEBOOK_*, GOOGLE_*
```

### Paleta de Colores (variables.css)
- **Fondo:** `#1D1D1B` (negro), `#282828` (gris oscuro), `#2F2418` (marrón)
- **Texto:** `#FBF7F1` (crema), `#E6E6E6` (gris claro)
- **Acento:** `#B70606` (rojo Econos)
- **Plataformas:** `#1877f2` (FB), `#e1306c` (IG), `#ff0000` (YT)
- **Glassmorphism:** `rgba(40, 40, 40, 0.85)` con `backdrop-filter: blur(12px)`

### Modelo de Datos Relevante (schema.prisma)
```prisma
model User {
  id, name, email, password, role (SUPER_ADMIN|ADMIN|EDITOR|VIEWER)
  socialAccounts SocialAccount[]
  campaigns Campaign[]
}

model SocialAccount {
  id, userId, provider, providerAccountId, accessToken, refreshToken
  expiresAt, accountName, pageId, pageName, igAccountId
  @@unique([provider, providerAccountId])
  @@unique([userId, provider])  // ← Actualmente: 1 cuenta por plataforma por user
}

model Campaign {
  id, name, userId, status (draft|scheduled|published|failed)
  hashtags, firstComment
  ads Ad[]
}

model Ad {
  id, campaignId, title, description, mediaType (image|video)
  mediaUrl, thumbnailUrl
  publications Publication[]
}

model Publication {
  id, adId, platform, type (organic|paid), status (pending|published|failed)
  destination (feed|fanpage|both|reels|stories|shorts|ads)
  externalPostId, publishedAt, errorLog
  clicks, impressions, reach, spend, insightsUpdatedAt
  adBudget AdBudget?
}

model AdBudget {
  id, publicationId, dailyBudget, totalBudget
  startDate, endDate, targetAudience (JSON string)
}
```

### Credenciales de Desarrollo
- **Admin:** admin@smm.com / admin123
- **Facebook App ID:** 1860215584886663
- **NEXTAUTH_URL:** http://localhost:3000

### Convenciones de Código Importantes
1. **Next.js 16:** Los `params` de rutas dinámicas son `Promise`. Ejemplo: `{ params: Promise<{ id: string }> }` y se resuelven con `const { id } = await context.params` o `const { id } = use(params)` en client components.
2. **CSS Modules:** Cada componente usa `.module.css`. NO usar TailwindCSS.
3. **Glassmorphism:** Usar clase global `glass-panel` para paneles con transparencia.
4. **API Pattern:** `getServerSession(authOptions)` para verificar auth en API routes.
5. **Idioma UI:** Todo en español.

---

## FASES DE IMPLEMENTACIÓN

Ejecutar en orden. Cada fase: implementar → verificar → pedir aprobación al usuario.

---

## FASE 1: Fix versión Facebook Graph API (v19.0 → v24.0)

### Problema
Todas las llamadas a Facebook usan `v19.0` pero la app debe trabajar sobre `v24.0`. La URL de OAuth generada es:
`https://www.facebook.com/v19.0/dialog/oauth?client_id=...` y debe ser `v24.0`.

### Cambios

#### Archivo: `src/lib/social/facebook.ts`
**Línea 9:** Cambiar la constante:
```typescript
// ANTES:
const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";
// DESPUÉS:
const FB_GRAPH_URL = "https://graph.facebook.com/v24.0";
```

**Línea 33:** Cambiar la URL del OAuth dialog:
```typescript
// ANTES:
return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}...`;
// DESPUÉS:
return `https://www.facebook.com/v24.0/dialog/oauth?client_id=${appId}...`;
```

#### Archivo: `src/app/api/social/callback/[provider]/route.ts`
**Línea 49:** Cambiar la llamada al Graph API:
```typescript
// ANTES:
const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`);
// DESPUÉS:
const meRes = await fetch(`https://graph.facebook.com/v24.0/me?fields=id,name&access_token=${accessToken}`);
```

### Verificación
1. Iniciar el servidor: `npm run dev`
2. Ir a Cuentas Sociales → Conectar Facebook
3. Verificar que la URL de redirección contenga `v24.0` (inspeccionar en consola de red o ver la barra de dirección)

---

## FASE 2: Cambiar texto en Cuentas Sociales

### Problema
El texto actual en la página de Cuentas Sociales es demasiado técnico:
> "Para conectar Facebook e Instagram necesitas una Meta Developer App con los permisos pages_manage_posts e instagram_content_publish..."

### Cambios

#### Archivo: `src/app/(dashboard)/settings/accounts/page.tsx`
**Líneas 180-187:** Reemplazar el bloque `infoBox` completo:
```tsx
// ANTES:
<div className={styles.infoBox}>
  <strong>💡 Nota importante:</strong> Para conectar Facebook e Instagram necesitas una{" "}
  <strong>Meta Developer App</strong> con los permisos <code>pages_manage_posts</code> e{" "}
  <code>instagram_content_publish</code>. Para YouTube necesitas un proyecto en{" "}
  <strong>Google Cloud Console</strong> con la YouTube Data API v3 habilitada.
  <br /><br />
  Configura las credenciales en el archivo <code>.env</code> del proyecto.
</div>

// DESPUÉS:
<div className={styles.infoBox}>
  <strong>💡</strong> Conecta tus redes sociales y concede los permisos necesarios para poder publicar directamente desde SMM.
</div>
```

### Verificación
Visual: Ir a Configuración → Cuentas Sociales y confirmar que el nuevo texto se muestra.

---

## FASE 3: Logo más grande + Versión en footer + Favicon

### Cambios

#### Archivo: `src/components/layout/Sidebar.tsx`
**Línea 40:** Aumentar el tamaño del logo:
```tsx
// ANTES:
<Image src="/images/logo-smm.png" alt="SMM Logo" width={175} height={50} className={styles.smmLogo} priority />
// DESPUÉS:
<Image src="/images/logo-smm.png" alt="SMM Logo" width={210} height={60} className={styles.smmLogo} priority />
```

**Después de línea 106 (cierre del div userInfo), antes del cierre del div footer (línea 108):** Agregar versión:
```tsx
<div className={styles.versionTag}>v1.0</div>
```

#### Archivo: `src/components/layout/Sidebar.module.css`
**Línea 16:** Cambiar height del logoContainer:
```css
/* ANTES: */
height: 85px;
/* DESPUÉS: */
height: 100px;
```

**Agregar al final del archivo (antes del media query):**
```css
.versionTag {
  text-align: center;
  font-size: 0.65rem;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.6;
  padding-top: 0.5rem;
}
```

#### Archivo: `src/app/layout.tsx`
Agregar iconos en metadata para usar favicon.png:
```tsx
export const metadata: Metadata = {
  title: "Social Media Manager",
  description: "Manage your ads on Facebook, Instagram, and YouTube",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};
```

### Verificación
1. Logo más grande visible en sidebar
2. "v1.0" visible en el pie del sidebar
3. Favicon visible en la pestaña del navegador

---

## FASE 4: Opción "Crear Campaña" en dropdown de anuncios

### Problema
Si no hay campañas al crear un anuncio, el dropdown solo muestra "Seleccionar campaña" vacío.

### Cambios

#### Archivo: `src/app/(dashboard)/ads/new/page.tsx`

1. **Agregar estado para modal de crear campaña:**
```typescript
const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
const [newCampaignName, setNewCampaignName] = useState("");
const [creatingSampaign, setCreatingCampaign] = useState(false);
```

2. **Agregar función para crear campaña:**
```typescript
const handleCreateCampaign = async () => {
  if (!newCampaignName.trim()) return;
  setCreatingCampaign(true);
  try {
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCampaignName }),
    });
    if (res.ok) {
      const newCampaign = await res.json();
      setCampaigns(prev => [...prev, newCampaign]);
      setCampaignId(newCampaign.id);
      setNewCampaignName("");
      setShowNewCampaignModal(false);
    }
  } finally {
    setCreatingCampaign(false);
  }
};
```

3. **Modificar el `<select>` de campaña** para agregar la opción "+ Crear":
```tsx
<select className={styles.select} value={campaignId} onChange={(e) => {
  if (e.target.value === "__new__") {
    setShowNewCampaignModal(true);
    return;
  }
  setCampaignId(e.target.value);
}} required>
  <option value="">Seleccionar campaña</option>
  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
  <option value="__new__">+ Crear nueva campaña</option>
</select>
```

4. **Agregar modal** inline después del select:
```tsx
{showNewCampaignModal && (
  <div style={{
    marginTop: "0.75rem", padding: "1rem",
    background: "var(--bg-primary)", border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-md)", display: "flex", gap: "0.5rem", alignItems: "center"
  }}>
    <input
      className={styles.input}
      placeholder="Nombre de la nueva campaña"
      value={newCampaignName}
      onChange={(e) => setNewCampaignName(e.target.value)}
      autoFocus
      style={{ flex: 1 }}
    />
    <button type="button" className={styles.btnPrimary}
      style={{ padding: "0.5rem 1rem", whiteSpace: "nowrap" }}
      onClick={handleCreateCampaign} disabled={creatingSampaign}>
      {creatingSampaign ? "Creando..." : "Crear"}
    </button>
    <button type="button" className={styles.btnSecondary}
      style={{ padding: "0.5rem 0.75rem" }}
      onClick={() => setShowNewCampaignModal(false)}>
      ✕
    </button>
  </div>
)}
```

### Verificación
1. Ir a crear anuncio → ver opción "+ Crear nueva campaña" al final del dropdown
2. Seleccionarla → aparece el mini formulario
3. Crear campaña → se selecciona automáticamente en el dropdown

---

## FASE 5: Botón "VER" anuncio + Modal de vista previa

### Cambios

#### Archivo: `src/app/(dashboard)/ads/page.tsx`

1. **Agregar estado para el anuncio que se está viendo:**
```typescript
const [viewingAd, setViewingAd] = useState<Ad | null>(null);
```

2. **Agregar botón "Ver" en la card (línea 78-81, dentro de cardActions):**
```tsx
<div className={styles.cardActions}>
  <button className={styles.iconBtn} title="Ver" onClick={() => setViewingAd(ad)}>👁️ Ver</button>
  <button className={styles.iconBtn} title="Editar" onClick={() => router.push(`/ads/${ad.id}`)}>✏️ Editar</button>
  <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Eliminar" onClick={() => handleDelete(ad.id)}>🗑️ Eliminar</button>
</div>
```

3. **Agregar el modal al final del return, antes del cierre de `</div>` del container:**
```tsx
{viewingAd && (
  <div className={styles.modalOverlay} onClick={() => setViewingAd(null)}>
    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3>Vista Previa del Anuncio</h3>
        <button className={styles.modalClose} onClick={() => setViewingAd(null)}>✕</button>
      </div>
      {viewingAd.mediaUrl && viewingAd.mediaType === "image" && (
        <img src={viewingAd.mediaUrl} alt={viewingAd.title} className={styles.modalMedia} />
      )}
      {viewingAd.mediaUrl && viewingAd.mediaType === "video" && (
        <video src={viewingAd.mediaUrl} controls className={styles.modalMedia} />
      )}
      <div className={styles.modalBody}>
        <h3 className={styles.modalTitle}>{viewingAd.title}</h3>
        {viewingAd.description && <p className={styles.modalDesc}>{viewingAd.description}</p>}
        <div className={styles.modalMeta}>
          <span>📁 {viewingAd.campaign.name}</span>
          <span className={styles.mediaBadge}>{viewingAd.mediaType}</span>
        </div>
      </div>
    </div>
  </div>
)}
```

#### Archivo: `src/app/(dashboard)/ads/Ads.module.css`
**Agregar al final:**
```css
/* Modal de vista previa */
.modalOverlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px); z-index: 100;
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.modalContent {
  background: var(--bg-secondary); border: 1px solid var(--border-color);
  border-radius: var(--radius-xl); max-width: 600px; width: 90%;
  max-height: 85vh; overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.modalHeader {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color);
}
.modalHeader h3 { font-size: 1rem; font-weight: 600; }
.modalClose {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); font-size: 0.9rem;
  transition: all var(--transition-fast);
}
.modalClose:hover { background: var(--bg-tertiary); color: var(--text-primary); }

.modalMedia { width: 100%; max-height: 400px; object-fit: cover; }
.modalBody { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
.modalTitle { font-size: 1.125rem; font-weight: 600; }
.modalDesc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; }
.modalMeta { display: flex; gap: 0.75rem; align-items: center; font-size: 0.8rem; color: var(--text-muted); }
```

### Verificación
1. Ir a "Mis Anuncios"
2. Ver el botón "👁️ Ver" en cada card
3. Clic → se abre el modal con imagen, título, descripción
4. Clic fuera o en ✕ → se cierra

---

## FASE 6: Fix click en campaña → Página de detalle

### Problema
Al hacer clic en una campaña, navega a `/campaigns/${c.id}` pero esa ruta no existe (404).

### Cambios

#### Archivo NUEVO: `src/app/api/campaigns/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        ads: {
          include: {
            publications: {
              include: { adBudget: true }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!campaign || campaign.userId !== session.user.id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.userId !== session.user.id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
```

#### Archivo NUEVO: `src/app/(dashboard)/campaigns/[id]/page.tsx`
Crear una página de detalle de campaña que muestre:
- Header con nombre de campaña, estado (badge), fecha de creación
- Botón "← Volver a Campañas" y "Añadir Anuncio"
- Grid/tabla de anuncios dentro de la campaña, cada uno mostrando:
  - Miniatura del media
  - Título
  - Estado de publicaciones (badges: publicado en FB, pendiente en IG, etc.)
  - Métricas agregadas (clics, alcance, impresiones)
  - Acciones: Ver, Editar, Publicar (lleva al publish wizard)
- Resumen de estadísticas de la campaña (KPIs con totales)

**Usar `use(params)` para resolver el parámetro dinámico en client component.**

#### Archivo NUEVO: `src/app/(dashboard)/campaigns/[id]/CampaignDetail.module.css`
Estilos para la página de detalle, usando el design system existente (glass-panel, variables CSS).

### Verificación
1. Ir a Campañas → clic en una campaña
2. Se abre la página de detalle con sus anuncios
3. Los botones funcionan (Añadir Anuncio, Ver, Editar, Publicar)

---

## FASE 7: Cargar anuncio desde link (web scraping)

### Decisiones del usuario
- El link puede ser de una página web externa (producto, blog) O de una publicación en redes sociales
- Los hashtags deben generarse automáticamente Y también el usuario puede editarlos

### Cambios

#### Archivo NUEVO: `src/app/api/scrape/route.ts`
Endpoint `POST /api/scrape` que:
1. Recibe `{ url: string }`
2. Hace `fetch(url)` para obtener el HTML
3. Parsea con regex/string matching para extraer:
   - `og:title` → `<title>` → primer `<h1>` como fallback
   - `og:description` → `<meta name="description">` como fallback
   - `og:image` → primeras `<img>` con src absoluto como fallback
   - Genera 4-5 hashtags basados en palabras clave del título y descripción (excluyendo stopwords)
   - Genera primer comentario sugerido: `"🔗 Descubre más aquí: {url}"`
4. Retorna `{ title, description, images: string[], hashtags: string[], suggestedComment: string }`
5. NO requiere dependencias externas (solo fetch nativo + regex)

#### Archivo: `src/app/(dashboard)/ads/new/page.tsx`
1. **Agregar campo de URL al inicio del formulario** (antes de la sección de información):
   - Input con placeholder "https://ejemplo.com/producto..."
   - Botón "🔗 Cargar desde link"
   - Estado de carga (spinner)
2. **Al cargar exitosamente:**
   - Popular `title`, `description`, `hashtagsStr`, `firstComment`
   - Mostrar galería horizontal de imágenes detectadas
   - Al hacer clic en una imagen, descargarla via proxy y subirla como media del anuncio
3. **Función handler:**
```typescript
const handleScrapeLink = async () => {
  if (!scrapeUrl.trim()) return;
  setScrapingLoading(true);
  try {
    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: scrapeUrl })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.title && !title) setTitle(data.title);
      if (data.description && !description) setDescription(data.description);
      if (data.hashtags?.length && !hashtagsStr) setHashtagsStr(data.hashtags.join(", "));
      if (data.suggestedComment && !firstComment) setFirstComment(data.suggestedComment);
      setScrapedImages(data.images || []);
    } else {
      alert("No se pudo extraer información del link");
    }
  } catch {
    alert("Error al procesar el link");
  } finally {
    setScrapingLoading(false);
  }
};
```

### Verificación
1. Ir a crear anuncio → pegar un link (ej: URL de Amazon, artículo de blog)
2. Clic en "Cargar desde link"
3. Se populan los campos automáticamente
4. Se muestran las imágenes detectadas
5. Seleccionar una imagen → se carga como media del anuncio

---

## FASE 8: Vista previa por red social en crear/editar anuncio

### Cambios

#### Archivo: `src/app/(dashboard)/ads/new/page.tsx`
Reemplazar la vista previa única "Vista Previa Estándar" por un componente con tabs:
- **Tab "📘 Facebook"**: Simula un post de Facebook (avatar, nombre, hora, texto, imagen, barra de reacciones: 👍 Me gusta, 💬 Comentar, ↗️ Compartir)
- **Tab "📷 Instagram"**: Simula un post de IG (header con avatar+nombre, imagen cuadrada, íconos ❤️ 💬 ✈️, likes, descripción truncada)
- **Tab "🎬 YouTube"**: Simula una miniatura (thumbnail 16:9, título, nombre del canal, views, fecha)

Agregar estado `previewTab` con valores `"facebook" | "instagram" | "youtube"`.

#### Archivo: `src/app/(dashboard)/ads/new/AdForm.module.css`
Agregar estilos para:
- `.previewTabs` (barra de tabs horizontal)
- `.previewTab` / `.previewTabActive` (tabs individuales)
- `.fbPreview`, `.igPreview`, `.ytPreview` (layouts por plataforma)
- Barra de reacciones de FB, íconos de IG, miniatura de YT

#### También aplicar en: `src/app/(dashboard)/ads/[id]/page.tsx`
La misma vista previa con tabs para la página de edición.

### Verificación
1. Ir a crear anuncio → llenar campos y subir imagen
2. En el panel derecho, ver las 3 tabs: Facebook, Instagram, YouTube
3. Cambiar entre tabs → cada una muestra un diseño diferente

---

## FASE 9: Panel de tracking ampliado en dashboard

### Cambios

#### Archivo: `src/app/(dashboard)/page.tsx`
Expandir la tabla de actividad reciente:
1. **Nuevas columnas:** Plataforma (ícono), Tipo (Orgánico/ADS badge), Impresiones, Botón Sync individual
2. **Mini-barras visuales** para las métricas (pequeñas barras coloreadas proporcionales al máximo)
3. **Botón de sync individual** que llama a `/api/social/insights/sync?publicationId=xxx`
4. **Mejor diseño de la tabla** con hover effects y separadores

#### Archivo: `src/app/(dashboard)/Dashboard.module.css`
Agregar estilos para:
- `.metricBar` y `.metricBarFill` (mini-barras inline)
- `.syncBtnSmall` (botón de sync para cada fila)
- `.platformBadge` (ícono de plataforma)
- `.typeBadge` (badge orgánico/ads)

### Verificación
1. Dashboard muestra tabla de publicaciones con métricas detalladas
2. Botón de sync individual funciona (llama al API)
3. Las mini-barras se renderizan proporcionalmente

---

## FASE 10: Segmentación completa tipo Meta Ads Manager

### Cambios

#### Archivo: `src/app/(dashboard)/ads/[id]/publish/page.tsx`
Cuando `destination === "ads"`, expandir el formulario de segmentación en Step 3 con secciones colapsables:

1. **Objetivo de Campaña:**
   - Select con: Alcance, Tráfico, Engagement, Conversiones, Ventas, Reconocimiento de marca
2. **Ubicación Geográfica:**
   - País (select con lista amplia)
   - Estado/Región (input libre)
   - Ciudad (input libre)
   - Radio en km (slider 1-100)
3. **Demografía:**
   - Edad Min/Max (inputs numéricos)
   - Género (Todos/Hombres/Mujeres)
   - Idioma (multiselect: Español, Inglés, Portugués, etc.)
   - Estado civil (select)
   - Nivel de educación (select)
4. **Intereses y Comportamientos:**
   - Categorías de interés con checkboxes: Deportes, Tecnología, Moda, Negocios, Gastronomía, Viajes, Salud, Entretenimiento, Educación, Finanzas
   - Comportamientos: Compradores frecuentes, Viajeros frecuentes, Usuarios de móvil, etc.
5. **Placements (Ubicaciones de publicación):**
   - Automático (recomendado)
   - Manual: Feed, Stories, Reels, Audience Network, Marketplace
6. **Presupuesto y Programación:**
   - Tipo de presupuesto: Diario / Total
   - Monto (USD)
   - Estrategia de puja: Menor costo, Costo objetivo, Límite de costo
   - Fecha de inicio / Fecha de fin (date inputs)
   - Horarios específicos (opcional)
7. **Audiencia Estimada** (barra visual decorativa tipo Meta que muestra "Definida / Amplia / Específica")

Cada sección usa un **accordion colapsable** (clic para abrir/cerrar) para no abrumar.

#### Archivo: `src/app/(dashboard)/ads/[id]/publish/Publish.module.css`
Agregar estilos para:
- `.accordion`, `.accordionHeader`, `.accordionBody`
- `.audienceGauge` (barra de audiencia estimada)
- `.checkboxGrid` (grid de checkboxes para intereses)
- `.sliderContainer` (para el radio en km)

### Verificación
1. Crear anuncio → Publicar → Seleccionar plataforma → Seleccionar "Ads"
2. Ver formulario completo de segmentación con secciones colapsables
3. Todas las opciones se guardan en el adsConfig
4. La barra de audiencia estimada se muestra

---

## FASE 11: Límite de cuentas sociales por usuario (Admin configurable)

### Problema
Actualmente cada usuario solo puede tener 1 cuenta social por plataforma (constraint `@@unique([userId, provider])`). Se necesita que el SuperAdmin pueda configurar cuántas cuentas puede tener cada usuario.

### Cambios

#### Archivo: `prisma/schema.prisma`
**Modelo User — agregar campo:**
```prisma
model User {
  // ... campos existentes ...
  maxSocialAccounts Int @default(1)  // Máximo de cuentas sociales permitidas
  // ... relaciones existentes ...
}
```

> **NOTA:** El constraint `@@unique([userId, provider])` en SocialAccount se mantiene por ahora. El `maxSocialAccounts` controla el TOTAL de cuentas (no por plataforma). Un usuario con max=1 puede tener 1 Facebook O 1 Instagram O 1 YouTube. Con max=3 puede tener las 3.

Después de modificar el schema, ejecutar:
```bash
npx prisma db push
```

#### Archivo: `src/app/api/users/route.ts`
- En el `GET`: agregar `maxSocialAccounts` al `select`
- En el `POST`: agregar `maxSocialAccounts` al `data` del create (valor por defecto desde el body o 1)

#### Archivo: `src/app/api/users/[id]/route.ts`
- En el `PUT`: agregar `maxSocialAccounts` al `dataToUpdate`

#### Archivo: `src/app/(dashboard)/admin/users/page.tsx`
1. **Agregar al type User:**
```typescript
type User = {
  // ... existentes ...
  maxSocialAccounts: number;
};
```

2. **Agregar al formData:**
```typescript
const [formData, setFormData] = useState({
  name: "", email: "", password: "", role: "VIEWER",
  maxSocialAccounts: 1  // NUEVO
});
```

3. **Agregar campo en el modal de crear/editar:**
```tsx
<div className={styles.formGroup}>
  <label className={styles.label}>Máx. Cuentas Sociales</label>
  <select
    className={styles.select}
    value={formData.maxSocialAccounts}
    onChange={(e) => setFormData({...formData, maxSocialAccounts: Number(e.target.value)})}
  >
    <option value={1}>1 cuenta</option>
    <option value={2}>2 cuentas</option>
    <option value={3}>3 cuentas</option>
    <option value={4}>4 cuentas</option>
    <option value={5}>5 cuentas</option>
    <option value={99}>Ilimitadas</option>
  </select>
</div>
```

4. **Mostrar en la tabla de usuarios** una columna extra "Máx. Cuentas"

5. **Actualizar openModal** para incluir `maxSocialAccounts` al editar

#### Archivo: `src/app/(dashboard)/settings/accounts/page.tsx`
1. **Obtener el límite del usuario actual** (agregar un fetch a `/api/users/me` o incluirlo en la sesión)
2. **Mostrar indicador:** "Cuentas conectadas: X de Y"
3. **Bloquear el botón "Conectar"** si se alcanzó el límite con mensaje: "Has alcanzado el máximo de cuentas permitidas. Contacta al administrador."

**Opción para obtener el límite:** Crear un endpoint simple `GET /api/users/me` que retorna los datos del usuario actual incluyendo `maxSocialAccounts`. O agregar una nueva API route.

#### Archivo NUEVO (si es necesario): `src/app/api/users/me/route.ts`
```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, maxSocialAccounts: true }
  });
  return NextResponse.json(user);
}
```

### Verificación
1. `npx prisma db push` → esquema actualizado sin errores
2. Ir a Admin → Usuarios → Crear/Editar usuario → ver campo "Máx. Cuentas Sociales"
3. Asignar límite de 1 a un usuario → en su vista de Cuentas Sociales, solo puede conectar 1
4. Admin cambia a 3 → ahora puede conectar hasta 3
5. Se muestra "Cuentas conectadas: X de Y" en la página de cuentas

---

## DESPUÉS DE COMPLETAR TODAS LAS FASES

> **IMPORTANTE:** Antes de subir a producción:
> 1. Ejecutar `npm run build` para verificar que no hay errores
> 2. **Preguntar al usuario qué versión colocar** (actualizar el `v1.0` en Sidebar.tsx y en package.json)
> 3. Hacer commit con mensaje descriptivo
