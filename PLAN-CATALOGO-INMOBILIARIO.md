# 🏠 Plan: Módulo de Catálogo Inmobiliario (Advantage+ Catalog Ads)

> **Estado:** PENDIENTE DE APROBACIÓN  
> **Fecha:** 2026-04-16  
> **Regla de Oro:** Cero modificaciones al core existente. Módulo paralelo e independiente.

---

## 1. Esquema de Base de Datos (Modelos Nuevos en `schema.prisma`)

Se añaden **3 modelos nuevos** al final del archivo. No se tocan los modelos existentes.

```prisma
/// ============================================
/// MÓDULO: Catálogo Inmobiliario (Advantage+)
/// ============================================

model PropertyCatalog {
  id              String   @id @default(cuid())
  userId          String
  name            String                          // "Catálogo ECONOS Madrid"
  metaCatalogId   String?                         // ID devuelto por Meta (ej. "794683571329")
  metaFeedId      String?                         // ID del Data Feed en Meta
  feedUrl         String?                         // URL pública del feed generado por nuestro sistema
  status          String   @default("draft")      // "draft", "syncing", "active", "error"
  syncError       String?
  lastSyncAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  properties      Property[]

  @@index([userId])
}

model Property {
  id              String   @id @default(cuid())
  catalogId       String
  
  // Campos obligatorios Meta Real Estate (home_listing)
  name            String                          // Título del inmueble
  description     String                          // Descripción larga
  price           Float                           // Precio en moneda local
  currency        String   @default("EUR")
  availability    String   @default("for_sale")   // "for_sale", "for_rent", "sale_pending", "sold", "off_market"
  
  // Ubicación
  address         String
  city            String
  state           String?
  country         String   @default("ES")
  postalCode      String?
  latitude        Float?
  longitude       Float?
  
  // Características
  propertyType    String   @default("house")      // "house", "apartment", "condo", "townhouse", "land", "other"
  bedrooms        Int?
  bathrooms       Int?
  areaSqm         Float?                          // Superficie en m²
  yearBuilt       Int?
  
  // Media
  imageUrl        String                          // Imagen principal (obligatoria para Meta)
  images          String?                         // JSON array de URLs adicionales
  virtualTourUrl  String?
  listingUrl      String?                         // Deep link a la ficha en web ECONOS
  
  // Sincronización con Meta
  metaItemId      String?                         // ID del item dentro del catálogo de Meta
  syncStatus      String   @default("pending")    // "pending", "synced", "error"
  syncError       String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  catalog         PropertyCatalog @relation(fields: [catalogId], references: [id], onDelete: Cascade)

  @@index([catalogId])
  @@index([syncStatus])
}
```

**Relaciones:** `PropertyCatalog` 1→N `Property`. Ninguna relación con `User`, `Campaign` u otros modelos existentes para mantener independencia total. El `userId` en `PropertyCatalog` es un campo de texto plano (sin FK), evitando acoplar con el modelo `User`.

> **Nota sobre FK de userId:** Si prefieres que el `userId` tenga FK con `User` para integridad referencial, puedo agregarlo. Lo omití por la regla de independencia total. Dime qué prefieres.

---

## 2. Estructura de Archivos (Nuevos)

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── real-estate/                          # ← NUEVA RUTA DE DASHBOARD
│   │       ├── page.tsx                          # Lista de catálogos del usuario
│   │       ├── RealEstate.module.css             # Estilos del módulo
│   │       ├── [catalogId]/
│   │       │   ├── page.tsx                      # Detalle de catálogo + lista de propiedades
│   │       │   └── CatalogDetail.module.css
│   │       └── new/
│   │           └── page.tsx                      # Formulario crear catálogo
│   │
│   └── api/
│       └── real-estate/                          # ← NUEVAS API ROUTES
│           ├── catalogs/
│           │   ├── route.ts                      # GET (listar) + POST (crear catálogo)
│           │   └── [catalogId]/
│           │       ├── route.ts                  # GET (detalle) + PUT (editar) + DELETE
│           │       └── sync/
│           │           └── route.ts              # POST → Sincronizar catálogo con Meta
│           ├── properties/
│           │   ├── route.ts                      # GET (listar) + POST (crear propiedad)
│           │   └── [propertyId]/
│           │       └── route.ts                  # GET + PUT + DELETE propiedad individual
│           └── feed/
│               └── [catalogId]/
│                   └── route.ts                  # GET → Genera XML/CSV público para Meta Data Feed
│
├── lib/
│   └── social/
│       └── meta-catalog.ts                       # ← NUEVO: Funciones de la API de Catálogos de Meta
│
└── components/
    └── real-estate/                              # ← NUEVOS COMPONENTES
        ├── PropertyForm.tsx                      # Formulario crear/editar propiedad
        ├── PropertyForm.module.css
        ├── PropertyCard.tsx                      # Card de propiedad en la lista
        ├── PropertyCard.module.css
        ├── CatalogStatusBadge.tsx                # Badge de estado de sincronización
        └── CatalogStatusBadge.module.css
```

**Sidebar:** Se añadirá **un único item** al array `navItems` en `Sidebar.tsx`:
```ts
{ name: "Inmuebles", href: "/real-estate", iconSrc: "/images/inmuebles.jpg" }
```
> Esto es la única "modificación" a un archivo existente, y es una adición de 1 línea al array, sin alterar lógica.

---

## 3. Estrategia de Integración con Meta (DECISIÓN TÉCNICA)

### Enfoque Recomendado: **Híbrido (Data Feed XML + API Graph para CRUD)**

| Aspecto | Data Feed XML (pasivo) | API Graph directa (activo) |
|---|---|---|
| **Creación de catálogo** | — | ✅ `POST /{business_id}/owned_product_catalogs` |
| **Alta/baja de items** | — | ✅ `POST /{catalog_id}/batch` (API Batch) |
| **Actualización automática** | ✅ Meta re-lee el feed cada X horas | — |
| **Actualización inmediata** | — | ✅ Cambios reflejados al instante |

### Flujo Propuesto (Paso a Paso):

```
 USUARIO                    NUESTRO SISTEMA                  META
   │                              │                            │
   ├── Crea Catálogo ──────────► │                            │
   │                              ├── POST /catalogs ────────►│ Crea catálogo en Meta
   │                              │◄── metaCatalogId ─────────┤
   │                              │                            │
   ├── Agrega Propiedad ───────► │                            │
   │                              ├── Guarda en BD local       │
   │                              ├── POST /{catalog}/batch ──►│ Sube item al catálogo
   │                              │◄── OK ────────────────────┤
   │                              │                            │
   ├── Edita precio ───────────► │                            │
   │                              ├── Actualiza BD local       │
   │                              ├── POST /{catalog}/batch ──►│ Actualiza item
   │                              │                            │
   │                   (BACKUP)   │                            │
   │                              ├── GET /feed/{id} ──────── │ Meta re-lee XML cada 24h
   │                              │   (endpoint público XML)   │ como respaldo de consistencia
```

### Justificación:
1. **API Graph Batch** para cambios en tiempo real (el usuario sube una propiedad → el anuncio en circulación la muestra inmediatamente).
2. **Feed XML como respaldo**, registrado en Meta como "Scheduled Feed" cada 24h para garantizar consistencia. Si un POST individual falla, Meta corregirá con el siguiente fetch del feed.
3. No se necesita un cron server externo; Meta hace el polling del feed automáticamente.

### Funciones nuevas en `meta-catalog.ts`:
```
createMetaCatalog(businessId, name, accessToken)         → Crea catálogo tipo "home_listings"
createMetaFeed(catalogId, feedUrl, accessToken)          → Registra nuestro feed URL en Meta
batchUpsertItems(catalogId, items[], accessToken)        → Upsert masivo de propiedades
batchDeleteItems(catalogId, itemIds[], accessToken)      → Elimina items del catálogo
getCatalogStatus(catalogId, accessToken)                 → Consulta estado y errores
```

---

## 4. API Routes (Detalle de Endpoints)

### `/api/real-estate/catalogs`

| Método | Descripción | Auth |
|--------|-------------|------|
| `GET` | Lista catálogos del usuario autenticado | ✅ session |
| `POST` | Crea un catálogo (local + Meta) | ✅ session |

**POST Body:**
```json
{
  "name": "Portafolio ECONOS Madrid",
  "socialAccountId": "cuid-de-la-cuenta-facebook-conectada"
}
```

### `/api/real-estate/catalogs/[catalogId]`

| Método | Descripción |
|--------|-------------|
| `GET` | Detalle de catálogo + count de propiedades |
| `PUT` | Renombrar catálogo |
| `DELETE` | Elimina catálogo local (y opcionalmente en Meta) |

### `/api/real-estate/catalogs/[catalogId]/sync`

| Método | Descripción |
|--------|-------------|
| `POST` | Fuerza sincronización completa con Meta (batch upsert de todas las propiedades) |

### `/api/real-estate/properties`

| Método | Descripción |
|--------|-------------|
| `GET` | Lista propiedades (filtro por `catalogId`) |
| `POST` | Crea propiedad + sincroniza con Meta automáticamente |

**POST Body:**
```json
{
  "catalogId": "cuid-del-catalogo",
  "name": "Apartamento 3 hab. en Salamanca",
  "description": "Luminoso apartamento...",
  "price": 385000,
  "currency": "EUR",
  "availability": "for_sale",
  "address": "Calle Serrano 45",
  "city": "Madrid",
  "country": "ES",
  "propertyType": "apartment",
  "bedrooms": 3,
  "bathrooms": 2,
  "areaSqm": 120,
  "imageUrl": "https://...",
  "images": ["https://...", "https://..."],
  "listingUrl": "https://econos.es/propiedad/abc123"
}
```

### `/api/real-estate/properties/[propertyId]`

| Método | Descripción |
|--------|-------------|
| `GET` | Detalle de propiedad individual |
| `PUT` | Edita propiedad + re-sincroniza con Meta |
| `DELETE` | Elimina propiedad local + remove del catálogo Meta |

### `/api/real-estate/feed/[catalogId]`

| Método | Descripción |
|--------|-------------|
| `GET` | **Público (sin auth)**. Devuelve XML en formato [Meta Home Listings Feed](https://developers.facebook.com/docs/marketing-api/catalog/guides/housing-feed-spec). Meta lo consumirá cada 24h. |

**Formato de salida (XML simplificado):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<listings>
  <listing>
    <home_listing_id>cuid-propiedad</home_listing_id>
    <name>Apartamento 3 hab. en Salamanca</name>
    <availability>for_sale</availability>
    <description>Luminoso apartamento...</description>
    <price>385000 EUR</price>
    <image><url>https://...</url></image>
    <address format="simple">
      <component name="addr1">Calle Serrano 45</component>
      <component name="city">Madrid</component>
      <component name="country">ES</component>
    </address>
    <listing_type>for_sale_by_agent</listing_type>
    <num_beds>3</num_beds>
    <num_baths>2</num_baths>
    <area_size>120</area_size>
    <area_unit>sq_m</area_unit>
    <url>https://econos.es/propiedad/abc123</url>
  </listing>
</listings>
```

---

## 5. Resumen de Impacto en Archivos Existentes

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | **Añadir** 2 modelos al final (0 líneas modificadas) |
| `src/components/layout/Sidebar.tsx` | **Añadir** 1 línea al array `navItems` |
| `public/images/` | **Añadir** 1 imagen `inmuebles.jpg` para el icono del sidebar |

**Todo lo demás es código 100% nuevo.**

---

## 6. Fases de Implementación (Sugeridas)

| Fase | Alcance | Involucra Meta API |
|------|---------|-------------------|
| **Fase 1** | BD + CRUD local + UI de propiedades | ❌ |
| **Fase 2** | Feed XML público + `meta-catalog.ts` | ✅ |
| **Fase 3** | Sincronización automática (batch API) | ✅ |
| **Fase 4** | Dashboard de estado de sincronización | ❌ |

---

## ⚠️ Preguntas Pendientes para el Usuario

1. **¿FK de userId?** — ¿Quieres que `PropertyCatalog.userId` tenga Foreign Key con el modelo `User`, o lo mantenemos desacoplado como texto plano?
2. **¿Business ID?** — Para crear catálogos vía API de Meta se necesita un `business_id` (del Business Manager). ¿Ya lo tienes configurado, o lo obtenemos dinámicamente desde la cuenta conectada del usuario?
3. **¿Imagen del icono del sidebar?** — ¿Tienes un archivo `inmuebles.jpg` para el sidebar, o debo generar uno?
4. **¿Prioridad de fase?** — ¿Empezamos con Fase 1 (CRUD local + UI sin Meta) para validar rápidamente, o saltas directo a la integración completa?
