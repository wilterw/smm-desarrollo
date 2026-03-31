import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  publishToFacebook, 
  publishToFacebookFeed, 
  createFacebookAdCampaign,
  createFacebookAdSet,
  createFacebookAdCreative,
  createFacebookAd
} from "@/lib/social/facebook";
import { publishToInstagram, publishToInstagramReels, publishToInstagramStories } from "@/lib/social/instagram";

/**
 * Automatically appends UTM parameters to any links in the message
 */
function applyUtmTracking(message: string, platform: string, destination: string, adId: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return message.replace(urlRegex, (url) => {
    const connector = url.includes('?') ? '&' : '?';
    return `${url}${connector}utm_source=smm&utm_medium=${platform}_${destination}&utm_campaign=ad_${adId}`;
  });
}

/**
 * POST /api/publish
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

    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: { campaign: true },
    });
    if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });

    const socialAccounts = await prisma.socialAccount.findMany({
      where: { userId: session.user.id },
    });

    const results: any[] = [];
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    
    let rawMessage = `${ad.title}\n\n${ad.description || ""}`;
    if (ad.campaign.hashtags) {
      const tags = ad.campaign.hashtags.split(",").map(t => t.trim().startsWith("#") ? t.trim() : `#${t.trim()}`).join(" ");
      rawMessage += `\n\n${tags}`;
    }
    
    const mediaFullUrl = ad.mediaUrl ? `${baseUrl}${ad.mediaUrl}` : undefined;

    for (const destConfig of destinations) {
      const { platform, destination, adsConfig, socialAccountId } = destConfig;
      
      // Find the specific account if socialAccountId is provided, otherwise fallback to the first one (for backward compatibility during migration)
      let account: any;
      if (socialAccountId) {
        account = socialAccounts.find(a => a.id === socialAccountId);
      } else {
        account = socialAccounts.find(a => a.provider === platform);
      }
      
      const message = applyUtmTracking(rawMessage, platform, destination, adId);

      const publication = await prisma.publication.create({
        data: {
          adId,
          platform,
          destination,
          socialAccountId: account?.id, // Link to specific account (Phase 11)
          type: destination === "ads" ? "paid" : "organic",
          status: "pending",
        },
      });

      // Save budget/targeting if it's an ad
      if (destination === "ads" && adsConfig) {
        await prisma.adBudget.create({
          data: {
            publicationId: publication.id,
            dailyBudget: adsConfig.budgetType === "daily" ? adsConfig.budgetAmount : null,
            totalBudget: adsConfig.budgetType === "total" ? adsConfig.budgetAmount : null,
            targetAudience: JSON.stringify({
              campaignObjective: adsConfig.campaignObjective,
              country: adsConfig.country,
              state: adsConfig.state,
              city: adsConfig.city,
              radiusKm: adsConfig.radiusKm,
              ageMin: adsConfig.ageMin,
              ageMax: adsConfig.ageMax,
              gender: adsConfig.gender,
              languages: adsConfig.languages,
              maritalStatus: adsConfig.maritalStatus,
              education: adsConfig.education,
              interests: adsConfig.interests,
              behaviors: adsConfig.behaviors,
              placements: adsConfig.placements,
              bidStrategy: adsConfig.bidStrategy
            })
          }
        });
      }

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
            const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID || "act_123456789"; 
            
            // 1. Create Campaign
            const campRes = await createFacebookAdCampaign(
              account.accessToken, 
              adAccountId, 
              `SMM - ${ad.campaign.name}`, 
              adsConfig?.budgetAmount || 10
            );
            if (!campRes.success) throw new Error(`Campaign error: ${campRes.error}`);

            // 2. Create AdSet (Targeting)
            const adSetRes = await createFacebookAdSet(
              account.accessToken,
              adAccountId,
              campRes.postId!,
              `AdSet - ${ad.title}`,
              adsConfig?.budgetAmount || 10,
              {
                country: adsConfig?.country || "US",
                ageMin: adsConfig?.ageMin || 18,
                ageMax: adsConfig?.ageMax || 65,
                gender: adsConfig?.gender || "all"
              }
            );
            if (!adSetRes.success) throw new Error(`AdSet error: ${adSetRes.error}`);

            // 3. Create Creative
            const creativeRes = await createFacebookAdCreative(
              account.accessToken,
              adAccountId,
              account.pageId || "",
              ad.title,
              message,
              mediaFullUrl
            );
            if (!creativeRes.success) throw new Error(`Creative error: ${creativeRes.error}`);

            // 4. Create Ad
            const adRes = await createFacebookAd(
              account.accessToken,
              adAccountId,
              adSetRes.postId!,
              creativeRes.postId!,
              `Ad - ${ad.title}`
            );
            if (!adRes.success) throw new Error(`Final Ad error: ${adRes.error}`);
            
            postId = adRes.postId;
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
