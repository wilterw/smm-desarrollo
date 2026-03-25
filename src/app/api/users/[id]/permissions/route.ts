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
  
  if (!session || (session.user?.role !== "SUPER_ADMIN" && session.user?.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId: id },
      include: { permission: true }
    });
    
    return NextResponse.json(userPermissions.map(up => up.permission));
  } catch (error: any) {
    console.error("GET permissions error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch user permissions" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { permissionIds } = body;

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json({ error: "permissionIds must be an array" }, { status: 400 });
    }

    // 1. Delete all existing permissions for this user
    await prisma.userPermission.deleteMany({
      where: { userId: id },
    });

    // 2. Insert new permissions one by one (SQLite-safe)
    for (const pId of permissionIds) {
      await prisma.userPermission.create({
        data: {
          userId: id,
          permissionId: pId,
        },
      });
    }

    return NextResponse.json({ message: "Permissions updated successfully" });
  } catch (error: any) {
    console.error("POST permissions error:", error?.message, error?.stack);
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}
