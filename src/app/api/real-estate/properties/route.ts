import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const filter = url.searchParams.get("filter") || "all";

    const whereClause: any = {
      catalog: { userId: session.user.id }
    };

    if (filter === "for_sale") {
      whereClause.availability = "for_sale";
    } else if (filter === "for_rent") {
      whereClause.availability = "for_rent";
    }

    const properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        catalog: { select: { name: true, metaCatalogId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(properties);
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    let catalogId = body.catalogId;
    
    // Create new catalog on the fly if needed
    if (!catalogId && body.newCatalogName) {
      let metaCatalogId = null;

      if (body.businessId) {
        // Try to create the catalog in Facebook Meta Business Manager
        const { createMetaCatalog } = require("@/lib/social/meta-catalog");
        const account = await prisma.account.findFirst({
           where: { userId: session.user.id, provider: "facebook" },
           select: { access_token: true }
        });
        if (account?.access_token) {
           const metaRes = await createMetaCatalog(body.businessId, account.access_token, body.newCatalogName.trim());
           if (metaRes.success && metaRes.id) {
              metaCatalogId = metaRes.id;
           }
        }
      }

      const newCatalog = await prisma.propertyCatalog.create({
        data: {
          name: body.newCatalogName.trim(),
          userId: session.user.id,
          metaCatalogId,
        }
      });
      catalogId = newCatalog.id;
    }

    // Verify catalog ownership
    const catalog = await prisma.propertyCatalog.findFirst({
      where: { 
        id: catalogId,
        userId: session.user.id
      }
    });

    if (!catalog) {
      return NextResponse.json({ error: "Catalog not found or unauthorized" }, { status: 404 });
    }

    if (!body.name || !body.price || !body.imageUrl || !body.city) {
      return NextResponse.json({ error: "Faltan campos obligatorios (Nombre, Precio, Imagen o Ciudad)" }, { status: 400 });
    }

    const imagesString = body.images && Array.isArray(body.images) ? JSON.stringify(body.images) : null;

    const property = await prisma.property.create({
      data: {
        catalogId: catalog.id,
        name: body.name,
        description: body.description || "",
        price: parseFloat(body.price),
        currency: body.currency || "EUR",
        availability: body.availability || "for_sale",
        address: body.address || "Dirección no especificada",
        city: body.city,
        state: body.state,
        country: body.country || "ES",
        postalCode: body.postalCode,
        propertyType: body.propertyType || "house",
        imageUrl: body.imageUrl,
        images: imagesString,
        listingUrl: body.listingUrl,
        syncStatus: "pending"
      }
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

    const prop = await prisma.property.findFirst({
      where: { id, catalog: { userId: session.user.id } }
    });

    if (!prop) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.property.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
