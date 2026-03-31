import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFacebookPostInsights, getFacebookAdInsights } from "@/lib/social/facebook";

/**
 * GET /api/social/insights/sync?publicationId=...
 * Syncs the latest metrics from Meta for a specific publication
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const publicationId = searchParams.get("publicationId");

  if (!publicationId) {
    return NextResponse.json({ error: "publicationId is required" }, { status: 400 });
  }

  try {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
      include: { ad: { include: { campaign: true } } }
    });

    if (!publication || !publication.externalPostId) {
      return NextResponse.json({ error: "Publication not found or not published" }, { status: 404 });
    }

    // Get the social account for the platform
    const account = await prisma.socialAccount.findFirst({
      where: { 
        userId: session.user.id,
        provider: publication.platform
      }
    });

    if (!account) return NextResponse.json({ error: "Social account not connected" }, { status: 400 });

    let insights: any = null;

    if (publication.platform === "facebook") {
      if (publication.destination === "ads") {
        insights = await getFacebookAdInsights(publication.externalPostId, account.accessToken);
      } else {
        insights = await getFacebookPostInsights(publication.externalPostId, account.accessToken);
      }
    } 
    // Add Instagram/YouTube logic here as needed

    if (insights && insights.success) {
      const updated = await prisma.publication.update({
        where: { id: publication.id },
        data: {
          clicks: insights.clicks || 0,
          impressions: insights.impressions || 0,
          reach: insights.reach || 0,
          spend: insights.spend || 0,
          insightsUpdatedAt: new Date(),
        }
      });
      return NextResponse.json({ success: true, data: updated });
    } else {
      return NextResponse.json({ error: insights?.error || "Could not fetch insights" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Sync error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
