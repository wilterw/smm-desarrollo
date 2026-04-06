import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  publishToFacebook, 
  publishToFacebookFeed, 
  publishMultiPhotoToFacebook,
  createFacebookAdCampaign,
  createFacebookAdSet,
  uploadFacebookAdImage,
  createFacebookAdCreative,
  createFacebookAdCarouselCreative,
  createFacebookAd,
  getFacebookAdAccountDetails
} from "@/lib/social/facebook";
import { 
  publishToInstagram, 
  publishToInstagramReels, 
  publishToInstagramStories,
  publishCarouselToInstagram 
} from "@/lib/social/instagram";

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
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    
    // SMM 3.0: High-reliability BaseURL detection
    let baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl || baseUrl.includes("localhost")) {
      // If we are on econos.io, we MUST force HTTPS for Meta to reach us
      if (host.includes("econos.io")) baseUrl = `https://${host}`;
      else baseUrl = `${protocol}://${host}`;
    }
    
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    
    let rawMessage = `${ad.title}\n\n${ad.description || ""}`;
    if (ad.campaign.hashtags) {
      const tags = ad.campaign.hashtags.split(",").map(t => t.trim().startsWith("#") ? t.trim() : `#${t.trim()}`).join(" ");
      rawMessage += `\n\n${tags}`;
    }
    
    // SMM 3.0: Aggressive URL Sanitation for Windows paths and Meta strictness
    const mediaUrlsRaw = ad.mediaUrl ? ad.mediaUrl.split(",") : [];
    const mediaFullUrls = mediaUrlsRaw
      .map(url => url.trim())
      .filter(url => url.length > 0)
      .map(url => {
        // Normalización Nuclear: Reemplazar todas las \ de Windows por /
        let cleanUrl = url.replace(/\\/g, "/");
        // Asegurar que no empiece por / si baseUrl también termina en / (aunque ya lo limpiamos)
        if (cleanUrl.startsWith("/")) cleanUrl = cleanUrl.substring(1);
        
        return cleanUrl.startsWith("http") ? cleanUrl : `${baseUrl}/${cleanUrl}`;
      });

    console.log(`[SMM 3.0 DEBUG] Final BaseURL: ${baseUrl}`);
    console.log(`[SMM 3.0 DEBUG] Final MediaURLs:`, mediaFullUrls);

    console.log(`[PUBLISH] Ad ID: ${adId}. Found ${mediaFullUrls.length} media items:`, mediaFullUrls);

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

        // 1. Meta Ads Flow (Unified FB/IG)
        if (destination === "ads") {
          if (!account.adAccountId) {
            throw new Error(`Cuenta Publicitaria no encontrada para '${account.pageName || account.accountName}'. Verifica que tengas acceso al Ads Manager con este usuario de Meta o desconecta y re-conecta en Cuentas Sociales asegurando marcar todos los permisos.`);
          }
          const adAccountId = account.adAccountId;

          // X. Status Diagnostic Check
          try {
            const accDetails = await getFacebookAdAccountDetails(adAccountId, account.accessToken);
            if (accDetails.account_status !== 1) {
              const statusMap: any = {
                2: "DESACTIVADA (Disabled). Tu cuenta ha sido inhabilitada por Meta. Revisa tu calidad de cuenta en Meta Business Suite.",
                3: "PAGO PENDIENTE (Settlement Required). Tienes una deuda o problema de facturación. Meta no permite crear anuncios hasta que saldes el saldo pendiente.",
                7: "EN REVISIÓN (Pending Review). Meta está revisando tu cuenta por motivos de seguridad.",
                8: "EN REVISIÓN (Settlement Review). Meta está revisando el pago de tu cuenta.",
                9: "RESTRINGIDA (In Grace Period). Revisa tu configuración de pagos.",
                101: "CERRADA (Closed). Esta cuenta ya no existe.",
                102: "PAGO PENDIENTE (Pending Settlement). Meta está procesando un pago pendiente.",
              };
              const errorMsg = statusMap[accDetails.account_status] || `ESTADO NO ACTIVO (${accDetails.account_status})`;
              throw new Error(`Meta Ad Account error: ${errorMsg}`);
            }
          } catch (diagError: any) {
             // Si falla el diagnóstico por permisos, seguimos adelante pero avisamos en logs
             console.error("[ADS_DIAGNOSTIC] FAILED:", diagError.message);
             if (diagError.message.includes("Meta Ad Account error")) throw diagError;
          }

          // A. Campaign
          const objectiveMapping: any = { 'MESSAGES': 'OUTCOME_ENGAGEMENT' };
          const campaignObjective = objectiveMapping[adsConfig?.campaignObjective] || adsConfig?.campaignObjective || "OUTCOME_TRAFFIC";

          const campRes = await createFacebookAdCampaign(
            account.accessToken, 
            adAccountId, 
            `SMM - ${ad.campaign.name}`, 
            adsConfig?.budgetAmount || 10,
            campaignObjective
          );
          if (!campRes.success) throw new Error(`Campaign error: ${campRes.error}`);

          // B. AdSet
          const adSetRes = await createFacebookAdSet(
            account.accessToken,
            adAccountId,
            campRes.postId!,
            `AdSet - ${ad.title}`,
            {
              country: adsConfig?.country || "ES",
              locations: adsConfig?.locations,
              radiusKm: adsConfig?.radiusKm,
              ageMin: adsConfig?.ageMin || 18,
              ageMax: adsConfig?.ageMax || 65,
              gender: adsConfig?.gender || "all",
              interests: adsConfig?.interests,
              customAudiences: adsConfig?.customAudiences,
              publisherPlatforms: platform === 'instagram' ? ['instagram'] : undefined,
              objective: campaignObjective
            },
            adsConfig?.budgetAmount || 10
          );
          if (!adSetRes.success) throw new Error(`AdSet error: ${adSetRes.error}`);

          // C. Image Hashes
          const uploadPromises = mediaFullUrls.map(url => uploadFacebookAdImage(account.accessToken, adAccountId, url));
          const uploadResults = await Promise.all(uploadPromises);
          const hashes = uploadResults.filter(r => r.success).map(r => r.hash!);
          if (hashes.length === 0) {
            throw new Error(`Media upload error: ${uploadResults[0]?.error || "No se pudo subir ninguna imagen"}`);
          }

          // D. Creative
          let creativeRes;
          if (hashes.length > 1) {
            creativeRes = await createFacebookAdCarouselCreative(
              account.accessToken,
              adAccountId,
              account.pageId || "",
              ad.title,
              message,
              hashes,
              ad.linkUrl || undefined,
              adsConfig,
              account.igAccountId || undefined
            );
          } else {
            creativeRes = await createFacebookAdCreative(
              account.accessToken,
              adAccountId,
              account.pageId || "",
              ad.title,
              message,
              hashes[0],
              ad.linkUrl || undefined,
              adsConfig,
              account.igAccountId || undefined
            );
          }
          if (!creativeRes.success) throw new Error(`Creative error: ${creativeRes.error}`);

          // E. Final Ad
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
        // 2. Facebook Organic Flow
        else if (platform === "facebook") {
          if (destination === "feed") {
            if (mediaFullUrls.length > 1) {
              const result = await publishMultiPhotoToFacebook("me", account.accessToken, message, mediaFullUrls);
              if (!result.success) throw new Error(result.error);
              postId = result.postId;
            } else {
              const result = await publishToFacebookFeed(account.accessToken, message, mediaFullUrls[0]);
              if (!result.success) throw new Error(result.error);
              postId = result.postId;
            }
          } else if (destination === "fanpage") {
            if (!account.pageId) throw new Error("No Facebook Page connected");
            if (mediaFullUrls.length > 1) {
              const result = await publishMultiPhotoToFacebook(account.pageId, account.accessToken, message, mediaFullUrls);
              if (!result.success) throw new Error(result.error);
              postId = result.postId;
            } else {
              const result = await publishToFacebook(account.pageId, account.accessToken, message, mediaFullUrls[0]);
              if (!result.success) throw new Error(result.error);
              postId = result.postId;
            }
          }
        }
        // 3. Instagram Organic Flow
        else if (platform === "instagram") {
          if (!account.igAccountId) throw new Error("No Instagram Business Account linked to the Facebook Page");
          if (mediaFullUrls.length === 0) throw new Error("Instagram requires media");
          
          if (destination === "feed") {
            if (mediaFullUrls.length > 1) {
              const items = mediaFullUrls.map(url => ({ url, type: ad.mediaType as any }));
              const result = await publishCarouselToInstagram(account.igAccountId, account.accessToken, items, message);
              if (!result.success) throw new Error(result.error);
              postId = result.postId;
            } else {
              const result = await publishToInstagram(account.igAccountId, account.accessToken, mediaFullUrls[0], message);
              if (!result.success) throw new Error(result.error);
              postId = result.postId;
            }
          } else if (destination === "reels") {
            if (ad.mediaType !== "video") throw new Error("Reels require a video file");
            const result = await publishToInstagramReels(account.igAccountId, account.accessToken, mediaFullUrls[0], message);
            if (!result.success) throw new Error(result.error);
            postId = result.postId;
          } else if (destination === "stories") {
            const result = await publishToInstagramStories(account.igAccountId, account.accessToken, mediaFullUrls[0], ad.mediaType as any);
            if (!result.success) throw new Error(result.error);
            postId = result.postId;
          }
        } 
        // 4. YouTube Flow
        else if (platform === "youtube") {
          if (mediaFullUrls.length === 0) throw new Error("YouTube requiere obligatoriamente un video para publicar.");
          if (ad.mediaType !== "video") throw new Error("YouTube requiere exclusivamente un archivo de video.");
          
          if (destination === "shorts") {
            throw new Error("La publicación en YouTube Shorts requiere acceso al sistema de archivos del servidor (próximamente)");
          } else {
            throw new Error("La publicación en YouTube requiere acceso al sistema de archivos del servidor (próximamente)");
          }
        }

        // Finalize Publication status in DB
        await prisma.publication.update({
          where: { id: publication.id },
          data: {
            status: "published",
            externalPostId: postId,
            publishedAt: new Date(),
          },
        });

        // First comment logic
        if (ad.campaign.firstComment && postId) {
          if (platform === "facebook" && destination === "fanpage") {
            try {
              await fetch(`https://graph.facebook.com/v19.0/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: ad.campaign.firstComment, access_token: account.accessToken })
              });
            } catch (e) { console.error("Comment failed", e); }
          } else if (platform === "instagram" && ["feed", "reels"].includes(destination)) {
            try {
              await fetch(`https://graph.facebook.com/v19.0/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: ad.campaign.firstComment, access_token: account.accessToken })
              });
            } catch (e) { console.error("Comment failed", e); }
          }
        }

        results.push({ platform, destination, status: "published", postId });
      } catch (err: any) {
        console.error(`[Publish Error] ${platform}/${destination}:`, err.message);
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
