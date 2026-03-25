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
    const ad = await prisma.ad.findUnique({
      where: { id },
      include: {
        campaign: { select: { name: true, userId: true, status: true } },
        publications: { include: { adBudget: true } },
      },
    });

    if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    return NextResponse.json(ad);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ad" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, description, mediaType, mediaUrl, thumbnailUrl } = body;

    const ad = await prisma.ad.update({
      where: { id },
      data: { title, description, mediaType, mediaUrl, thumbnailUrl },
    });

    return NextResponse.json(ad);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update ad" }, { status: 500 });
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
    await prisma.ad.delete({ where: { id } });
    return NextResponse.json({ message: "Ad deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete ad" }, { status: 500 });
  }
}
