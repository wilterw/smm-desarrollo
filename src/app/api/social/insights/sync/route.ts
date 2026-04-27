import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFacebookPostInsights, getFacebookAdInsights } from "@/lib/social/facebook";
import { getYouTubeVideoMetrics, refreshYouTubeToken } from "@/lib/social/youtube";

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

    let insights: { 
      success: boolean; 
      reach?: number; 
      clicks?: number; 
      impressions?: number; 
      spend?: number; 
      engagement?: number;
      error?: string 
    } | null = null;

    if (publication.platform === "facebook") {
      if (publication.destination === "ads") {
        insights = await getFacebookAdInsights(publication.externalPostId, account.accessToken);
      } else {
        insights = await getFacebookPostInsights(publication.externalPostId, account.accessToken);
      }
    } else if (publication.platform === "youtube") {
      let currentToken: string = account.accessToken;
      
      // Check if Google token is expired (they last 1h)
      if (account.expiresAt && new Date(account.expiresAt) <= new Date()) {
        if (account.refreshToken) {
          try {
            console.log(`[Sync] Refreshing expired YouTube token for account ${account.id}`);
            currentToken = await refreshYouTubeToken(account.refreshToken);
            
            // Save new token and update expiration (approx 1h)
            await prisma.socialAccount.update({
              where: { id: account.id },
              data: { 
                accessToken: currentToken,
                expiresAt: new Date(Date.now() + 3500 * 1000) 
              }
            });
          } catch (refreshErr: unknown) {
            const errMsg = refreshErr instanceof Error ? refreshErr.message : String(refreshErr);
            console.error("[Sync] Failed to refresh YT token:", errMsg);
          }
        }
      }
      
      insights = await getYouTubeVideoMetrics(publication.externalPostId, currentToken);
    }

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

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    console.error("Sync error:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
