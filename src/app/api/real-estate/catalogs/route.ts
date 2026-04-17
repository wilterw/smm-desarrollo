import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const catalogs = await prisma.propertyCatalog.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { properties: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(catalogs);
  } catch (error) {
    console.error("Error fetching catalogs:", error);
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
    const { name, businessId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let metaCatalogId = null;
    if (businessId) {
       const { createMetaCatalog } = require("@/lib/social/meta-catalog");
       const account = await prisma.account.findFirst({
           where: { userId: session.user.id, provider: "facebook" },
           select: { access_token: true }
       });
       if (account?.access_token) {
           const metaRes = await createMetaCatalog(businessId, account.access_token, name.trim());
           if (metaRes.success && metaRes.id) {
              metaCatalogId = metaRes.id;
           }
       }
    }

    const catalog = await prisma.propertyCatalog.create({
      data: {
        name: name.trim(),
        userId: session.user.id,
        metaCatalogId
      }
    });

    return NextResponse.json(catalog, { status: 201 });
  } catch (error) {
    console.error("Error creating catalog:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
