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
