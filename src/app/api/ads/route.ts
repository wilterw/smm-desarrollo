import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ads = await prisma.ad.findMany({
      include: {
        campaign: { select: { name: true, userId: true } },
        publications: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter to only show ads belonging to the user's campaigns
    const userAds = ads.filter(ad => ad.campaign.userId === session.user.id);
    return NextResponse.json(userAds);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { campaignId, title, description, mediaType, mediaUrl, thumbnailUrl, hashtags, firstComment, linkUrl } = body;

    if (!campaignId || !title || !mediaType) {
      return NextResponse.json({ error: "Missing required fields (campaignId, title, mediaType)" }, { status: 400 });
    }

    // Verify ownership of campaign
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.userId !== session.user.id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Update campaign with the new hashtags and firstComment if provided
    if (hashtags !== undefined || firstComment !== undefined) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          hashtags: hashtags !== undefined ? hashtags : campaign.hashtags,
          firstComment: firstComment !== undefined ? firstComment : campaign.firstComment,
        }
      });
    }

    const ad = await prisma.ad.create({
      data: {
        campaignId,
        title,
        description: description || "",
        mediaType,
        mediaUrl: mediaUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        linkUrl: linkUrl || null,
      },
    });

    return NextResponse.json(ad, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/ads error:", error?.message, error);
    return NextResponse.json({ error: error?.message || "Failed to create ad" }, { status: 500 });
  }
}
