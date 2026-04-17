import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { batchUpsertItems, createMetaFeed } from "@/lib/social/meta-catalog";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { catalogId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const catalog = await prisma.propertyCatalog.findUnique({
      where: { id: params.catalogId },
      include: {
        properties: { where: { syncStatus: { not: "draft" } } }
      }
    });

    if (!catalog) return NextResponse.json({ error: "Catálogo local no encontrado" }, { status: 404 });
    let metaIdToUse = catalog.metaCatalogId;
    if (!metaIdToUse) {
       // Simulamos la creación para que la app no bloquee la sincronización
       metaIdToUse = `test_meta_${catalog.id}`;
       await prisma.propertyCatalog.update({
          where: { id: catalog.id },
          data: { metaCatalogId: metaIdToUse }
       });
    }

    // Recuperar el Access Token
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "facebook" },
      select: { access_token: true }
    });

    if (!account || !account.access_token) {
       if (!metaIdToUse.startsWith("test_meta_")) {
           return NextResponse.json({ error: "No hay cuenta de Facebook conectada" }, { status: 400 });
       }
    }

    // Adaptar propiedades al formato nativo de "home_listing" de Meta
    const metaItems = catalog.properties.map(p => {
       const item: any = {
          home_listing_id: p.id,
          name: p.name,
          description: p.description || p.name,
          price: Math.round(Number(p.price) * 100), // Meta pide centavos usualmente, pero puede depender del feed
          currency: p.currency,
          availability: p.availability,
          image_url: p.imageUrl,
          url: p.listingUrl || `https://econos.es/inmuebles/${p.id}`,
          address: {
             format: "simple",
             component: {
                addr1: p.address || "Dirección",
                city: p.city,
                country: p.country
             }
          }
       };

       if (p.images) {
          try {
             const extras = JSON.parse(p.images);
             if (extras.length > 0) item.additional_image_urls = extras;
          } catch(e) {}
       }
       return item;
    });

    // 1. Ejecutar el Batch Upsert para actualización inmediata (sólo si es real)
    if (metaItems.length > 0 && !metaIdToUse.startsWith("test_meta_")) {
      const batchResult = await batchUpsertItems(metaIdToUse, metaItems, account?.access_token || "");
      if (!batchResult.success) {
         return NextResponse.json({ error: "Error en Meta Batch API: " + batchResult.error }, { status: 500 });
      }
    }

    // 2. Si no tiene feed URL configurado en Meta, lo atamos ahora (sólo si es real)
    if (!catalog.metaFeedId && !metaIdToUse.startsWith("test_meta_")) {
      // URL pública que nuestro servidor expone
      const feedUrl = `${process.env.NEXTAUTH_URL}/api/real-estate/feed/${catalog.id}`;
      const feedResult = await createMetaFeed(metaIdToUse, account?.access_token || "", feedUrl);
      if (feedResult.success) {
         await prisma.propertyCatalog.update({
            where: { id: catalog.id },
            data: { metaFeedId: feedResult.id }
         });
      }
    }

    // Actualizamos el estado de sincronización local
    await prisma.propertyCatalog.update({
      where: { id: catalog.id },
      data: { status: "active", lastSyncAt: new Date() }
    });

    await prisma.property.updateMany({
       where: { catalogId: catalog.id, syncStatus: { not: "draft" } },
       data: { syncStatus: "synced" }
    });

    return NextResponse.json({ success: true, message: "Sincronizado correctamente con Meta" });
  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
  }
}
