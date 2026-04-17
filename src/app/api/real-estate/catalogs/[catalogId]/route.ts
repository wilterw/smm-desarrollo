import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ catalogId: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await params since Next.js 15+ or 14.2 sometimes requires it or just use it directly
  const { catalogId } = await params;

  try {
    const catalog = await prisma.propertyCatalog.findFirst({
      where: { 
        id: catalogId,
        userId: session.user.id
      },
      include: {
        properties: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!catalog) {
      return NextResponse.json({ error: "Catalog not found" }, { status: 404 });
    }

    return NextResponse.json(catalog);
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ catalogId: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { catalogId } = await params;

  try {
    const catalog = await prisma.propertyCatalog.findFirst({
      where: { 
        id: catalogId,
        userId: session.user.id
      }
    });

    if (!catalog) {
      return NextResponse.json({ error: "Catalog not found" }, { status: 404 });
    }

    // Prisma handles cascading deletes for properties
    await prisma.propertyCatalog.delete({
      where: { id: catalog.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting catalog:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
