import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user?.role !== "SUPER_ADMIN" && session.user?.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(permissions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}
