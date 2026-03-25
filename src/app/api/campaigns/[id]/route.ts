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
          include: { publications: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
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
    const { name, status } = body;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: { name, status },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
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
    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ message: "Campaign deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
