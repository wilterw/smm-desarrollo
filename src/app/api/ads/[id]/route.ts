import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ad = await prisma.ad.findUnique({
      where: { id },
      include: {
        campaign: { select: { id: true, name: true, userId: true, hashtags: true, firstComment: true } },
        publications: {
          where: { type: "paid" },
          orderBy: { publishedAt: "desc" },
          take: 1,
          include: { adBudget: true }
        }
      },
    });

    if (!ad || ad.campaign.userId !== session.user.id) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json(ad);
  } catch (error) {
    console.error("GET /api/ads/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch ad details" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { 
      title, 
      description, 
      mediaType, 
      mediaUrl, 
      thumbnailUrl, 
      hashtags, 
      firstComment,
      linkUrl
    } = body;

    // Check ownership
    const ad = await prisma.ad.findUnique({
      where: { id },
      include: { campaign: true }
    });

    if (!ad || ad.campaign.userId !== session.user.id) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // Update the ad
    const updatedAd = await prisma.ad.update({
      where: { id },
      data: {
        title,
        description: description ?? ad.description,
        mediaType: mediaType ?? ad.mediaType,
        mediaUrl: mediaUrl ?? ad.mediaUrl,
        thumbnailUrl: thumbnailUrl ?? ad.thumbnailUrl,
        linkUrl: linkUrl !== undefined ? linkUrl : ad.linkUrl,
      },
    });

    // Update campaign metadata if provided
    if (hashtags !== undefined || firstComment !== undefined) {
      await prisma.campaign.update({
        where: { id: ad.campaignId },
        data: {
          hashtags: hashtags !== undefined ? hashtags : ad.campaign.hashtags,
          firstComment: firstComment !== undefined ? firstComment : ad.campaign.firstComment,
        }
      });
    }

    return NextResponse.json(updatedAd);
  } catch (error) {
    console.error("PUT /api/ads/[id] error:", error);
    return NextResponse.json({ error: "Failed to update ad" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Check ownership
    const ad = await prisma.ad.findUnique({
      where: { id },
      include: { campaign: true }
    });

    if (!ad || ad.campaign.userId !== session.user.id) {
      return NextResponse.json({ error: "Ad not found or unauthorized" }, { status: 404 });
    }

    // Delete the ad (cascades to publications and budgets due to Prisma schema)
    await prisma.ad.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Ad deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/ads/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete ad" }, { status: 500 });
  }
}

