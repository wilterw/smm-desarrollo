import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publishToFacebook, publishToFacebookFeed, createFacebookAdCampaign } from "@/lib/social/facebook";
import { publishToInstagram, publishToInstagramReels, publishToInstagramStories } from "@/lib/social/instagram";

/**
 * POST /api/publish
 * Body: { adId, destinations: [{ platform, destination, adsConfig }] }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { adId, destinations } = body;

    if (!adId || !Array.isArray(destinations) || destinations.length === 0) {
      return NextResponse.json({ error: "adId and destinations[] are required" }, { status: 400 });
    }

    // Fetch the ad and its campaign
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: { campaign: true },
    });
    if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });

    // Fetch user's connected social accounts
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { userId: session.user.id },
    });

    const results: { platform: string; destination: string; status: string; postId?: string; error?: string }[] = [];

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    let message = `${ad.title}\n\n${ad.description || ""}`;
    if (ad.campaign.hashtags) {
      // Clean and append hashtags
      const tags = ad.campaign.hashtags.split(",").map(t => t.trim().startsWith("#") ? t.trim() : `#${t.trim()}`).join(" ");
      message += `\n\n${tags}`;
    }
    const mediaFullUrl = ad.mediaUrl ? `${baseUrl}${ad.mediaUrl}` : undefined;

    for (const destConfig of destinations) {
      const { platform, destination, adsConfig } = destConfig;
      const account = socialAccounts.find(a => a.provider === platform);
      
      // Create the Publication record
      const publication = await prisma.publication.create({
        data: {
          adId,
          platform,
          destination,
          type: destination === "ads" ? "paid" : "organic",
          status: "pending",
        },
      });

      if (!account) {
        await prisma.publication.update({
          where: { id: publication.id },
          data: { status: "failed", errorLog: "No connected account" },
        });
        results.push({ platform, destination, status: "failed", error: "No connected account" });
        continue;
      }

      try {
        let postId: string | undefined;

        if (platform === "facebook") {
          if (destination === "feed") {
            const result = await publishToFacebookFeed(account.accessToken, message, mediaFullUrl);
            if (!result.success) throw new Error(result.error);
            postId = result.postId;
          } else if (destination === "fanpage") {
            if (!account.pageId) throw new Error("No Facebook Page connected");
            const result = await publishToFacebook(account.pageId, account.accessToken, message, mediaFullUrl);
            if (!result.success) throw new Error(result.error);
            postId = result.postId;
          } else if (destination === "ads") {
            // Need a valid ad account ID, usually configured in settings or from API. Mocking for now.
            const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID || "act_123456789"; 
            const result = await createFacebookAdCampaign(
              account.accessToken, 
              adAccountId, 
              ad.campaign.name, 
              adsConfig?.dailyBudget || 500,
              "OUTCOME_TRAFFIC"
            );
            if (!result.success) throw new Error(result.error);
            postId = result.postId;
          }
        } 
        else if (platform === "instagram") {
          if (!account.igAccountId) throw new Error("No Instagram Business Account linked to the Facebook Page");
          if (!mediaFullUrl) throw new Error("Instagram requires media");
          
          if (destination === "feed") {
            const result = await publishToInstagram(account.igAccountId, account.accessToken, mediaFullUrl, message);
            if (!result.success) throw new Error(result.error);
            postId = result.postId;
          } else if (destination === "reels") {
            if (ad.mediaType !== "video") throw new Error("Reels require a video file");
            const result = await publishToInstagramReels(account.igAccountId, account.accessToken, mediaFullUrl, message);
            if (!result.success) throw new Error(result.error);
            postId = result.postId;
          } else if (destination === "stories") {
            const result = await publishToInstagramStories(account.igAccountId, account.accessToken, mediaFullUrl, ad.mediaType as any);
            if (!result.success) throw new Error(result.error);
            postId = result.postId;
          } else if (destination === "ads") {
            throw new Error("Instagram Ads configuration must be managed through Facebook Ads Manager API");
          }
        } 
        else if (platform === "youtube") {
          // Placeholder for YouTube since it requires a Buffer upload
          // We would fetch the mediaUrl, convert to Buffer, and call publishToYouTubeShorts
          if (destination === "shorts") {
            throw new Error("YouTube Shorts publishing requires server-side file access (coming soon)");
          } else {
            throw new Error("YouTube publishing requires server-side file access (coming soon)");
          }
        }

        await prisma.publication.update({
          where: { id: publication.id },
          data: {
            status: "published",
            externalPostId: postId,
            publishedAt: new Date(),
          },
        });

        // Publish first comment if configured and supported
        if (ad.campaign.firstComment && postId && platform === "facebook" && destination === "fanpage") {
          try {
            await fetch(`https://graph.facebook.com/v19.0/${postId}/comments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: ad.campaign.firstComment, access_token: account.accessToken })
            });
          } catch (e) { console.error("Could not post first comment", e); }
        } else if (ad.campaign.firstComment && postId && platform === "instagram" && ["feed", "reels"].includes(destination)) {
          try {
            await fetch(`https://graph.facebook.com/v19.0/${postId}/comments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: ad.campaign.firstComment, access_token: account.accessToken })
            });
          } catch (e) { console.error("Could not post first comment", e); }
        }

        results.push({ platform, destination, status: "published", postId });
      } catch (err: any) {
        await prisma.publication.update({
          where: { id: publication.id },
          data: { status: "failed", errorLog: err.message },
        });
        results.push({ platform, destination, status: "failed", error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Publish error:", error.message);
    return NextResponse.json({ error: "Publishing failed" }, { status: 500 });
  }
}
