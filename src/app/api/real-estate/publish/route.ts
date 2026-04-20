import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { 
  publishMultiPhotoToFacebook,
  createFacebookAdCampaign,
  createFacebookAdSet,
  createFacebookAdCarouselCreative,
  createFacebookAd,
  getFacebookAdAccountDetails
} from "@/lib/social/facebook";
import { publishCarouselToInstagram } from "@/lib/social/instagram";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { propertyId, destinations } = body;

    if (!propertyId || !Array.isArray(destinations) || destinations.length === 0) {
      return NextResponse.json({ error: "propertyId y destinations[] son obligatorios" }, { status: 400 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, catalog: { userId: session.user.id } },
      include: { catalog: true },
    });

    if (!property) return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });

    const socialAccounts = await prisma.socialAccount.findMany({
      where: { userId: session.user.id },
    });

    const results: any[] = [];
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    let baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

    // Preparar mensaje orgánico base
    let rawMessage = `${property.name}\n\n${property.description || ""}`;
    if (property.price) {
      rawMessage += `\nPrecio: ${Number(property.price).toLocaleString()} ${property.currency}`;
    }

    // Recopilar urls
    const imgUrlsRaw = [property.imageUrl];
    if (property.images) {
      try {
        const extraImages = JSON.parse(property.images);
        extraImages.forEach((url: string) => {
          if (!imgUrlsRaw.includes(url)) imgUrlsRaw.push(url);
        });
      } catch (e) {}
    }

    const mediaFullUrls: string[] = [];

    // Proxy para descargar y servir localmente las urls de las imagenes a Meta
    for (const rawUrl of imgUrlsRaw) {
      const url = rawUrl.trim();
      if (!url || url.endsWith("/")) continue;

      let cleanUrl = url.replace(/\\/g, "/");
      if (cleanUrl.startsWith("/uploads/")) cleanUrl = cleanUrl.replace("/uploads/", "/api/media/");
      if (cleanUrl.startsWith("/")) cleanUrl = cleanUrl.substring(1);
      
      let fullUrl = cleanUrl.startsWith("http") ? cleanUrl : `${baseUrl}/${cleanUrl}`;

      const isInternal = fullUrl.includes(baseUrl.replace("https://", "").replace("http://", ""));
      if (fullUrl.startsWith("http") && !isInternal) {
        try {
          const dlRes = await fetch(fullUrl);
          if (dlRes.ok) {
            const buffer = await dlRes.arrayBuffer();
            const extMatch = fullUrl.split("?")[0].split(".").pop();
            const ext = (extMatch && extMatch.length <= 4) ? extMatch.toLowerCase() : "jpg";
            const filename = `${randomUUID()}.${ext}`;
            const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
            
            await mkdir(UPLOAD_DIR, { recursive: true });
            await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(buffer));
            
            fullUrl = `${baseUrl}/api/media/${filename}`;
          }
        } catch (e: any) {
          console.error(`[SMM Proxied Downloader RealEstate] Error descargando ${fullUrl}`, e.message);
        }
      }
      mediaFullUrls.push(fullUrl);
    }

    for (const d of destinations) {
      const { platform, destination, publishType, adsConfig } = d;

      // Type "catalog_sync"
      if (publishType === "catalog_sync") {
        const publication = await prisma.propertyPublication.create({
          data: { propertyId, catalogId: property.catalogId, platform: "meta", type: "catalog_sync", destination: "catalog", status: "published", publishedAt: new Date() }
        });
        results.push({ platform: "meta", destination: "catalog", status: "published" });
        continue;
      }

      const account = socialAccounts.find((acc) => acc.provider === platform);
      const publication = await prisma.propertyPublication.create({
        data: { propertyId, catalogId: property.catalogId, platform, type: publishType, destination, status: "pending" }
      });

      if (!account) {
        await prisma.propertyPublication.update({ where: { id: publication.id }, data: { status: "failed", errorLog: "No connected account" } });
        results.push({ platform, destination, status: "failed", error: "No connected account" });
        continue;
      }

      let postId: string | undefined;

      try {
        if (publishType === "ads" || destination === "ads") {
          if (!account.adAccountId) throw new Error(`Cuenta Publicitaria no encontrada para '${account.pageName || account.accountName}'.`);
          const adAccountId = account.adAccountId;

          // Verificamos estado
          const accDetails = await getFacebookAdAccountDetails(adAccountId, account.accessToken);
          if (accDetails.account_status !== 1) throw new Error("La cuenta publicitaria no está activa.");

          const campRes = await createFacebookAdCampaign(
            account.accessToken, adAccountId, `SMM Dynamic - ${property.name}`, adsConfig?.budgetAmount || 10, "OUTCOME_TRAFFIC"
          );
          if (!campRes.success) throw new Error(`Campaign error: ${campRes.error}`);

          const adSetRes = await createFacebookAdSet(
            account.accessToken, adAccountId, campRes.postId!, `AdSet - ${property.name}`,
            {
              country: adsConfig?.country || "ES",
              locations: adsConfig?.locations,
              radiusKm: adsConfig?.radiusKm,
              ageMin: 18, // Housing compliance for real estate
              ageMax: 65, // Housing compliance
              gender: "all", // Housing compliance
              publisherPlatforms: platform === 'instagram' ? ['instagram'] : undefined,
              objective: "OUTCOME_TRAFFIC"
            },
            adsConfig?.budgetAmount || 10
          );
          if (!adSetRes.success) throw new Error(`AdSet error: ${adSetRes.error}`);

          // Subir todas las imagenes
          const uploadPromises = mediaFullUrls.map(url => {
              const { uploadFacebookAdImage } = require("@/lib/social/facebook");
              return uploadFacebookAdImage(account.accessToken, adAccountId, url);
          });
          const uploadResults = await Promise.all(uploadPromises);
          const mediaHashes = uploadResults.filter(r => r.success).map(r => r.hash!);
          
          if (mediaHashes.length === 0) throw new Error(`Media upload error: No se pudo subir ninguna imagen`);

          // Crear Carousel Advantage+ con el title y el precio usando description
          const creativeRes = await createFacebookAdCarouselCreative(
             account.accessToken, adAccountId, account.pageId || "", property.name, rawMessage, mediaHashes, property.listingUrl || `https://econos.es/${property.id}`, adsConfig, account.igAccountId || undefined
          );
          if (!creativeRes.success) throw new Error(`Creative error: ${creativeRes.error}`);

          const adRes = await createFacebookAd(account.accessToken, adAccountId, adSetRes.postId!, creativeRes.postId!, `Ad - ${property.name}`);
          if (!adRes.success) throw new Error(`Final Ad error: ${adRes.error}`);
          postId = adRes.postId;

        } else if (publishType === "organic") {
           const messageUrl = property.listingUrl ? `\n\nLink: ${property.listingUrl}` : '';
           const finalMsg = rawMessage + messageUrl;

           if (platform === "facebook") {
             if (mediaFullUrls.length > 1) {
                const result = await publishMultiPhotoToFacebook(account.pageId || "me", account.accessToken, finalMsg, mediaFullUrls);
                if (!result.success) throw new Error(result.error);
                postId = result.postId;
             } else {
                const { publishToFacebook } = require("@/lib/social/facebook");
                const result = await publishToFacebook(account.pageId || "me", account.accessToken, finalMsg, mediaFullUrls[0]);
                if (!result.success) throw new Error(result.error);
                postId = result.postId;
             }
           } else if (platform === "instagram") {
             if (!account.igAccountId) throw new Error("No Instagram Business Account linked");
             if (mediaFullUrls.length === 0) throw new Error("Instagram requires media");
             
             if (mediaFullUrls.length > 1) {
                const items = mediaFullUrls.map(url => ({ url, type: "image" as const }));
                const result = await publishCarouselToInstagram(account.igAccountId, account.accessToken, items, finalMsg);
                if (!result.success) throw new Error(result.error);
                postId = result.postId;
             } else {
                const { publishToInstagram } = require("@/lib/social/instagram");
                const result = await publishToInstagram(account.igAccountId, account.accessToken, mediaFullUrls[0], finalMsg);
                if (!result.success) throw new Error(result.error);
                postId = result.postId;
             }
           }
        }

        await prisma.propertyPublication.update({
          where: { id: publication.id },
          data: { status: "published", externalPostId: postId, publishedAt: new Date() },
        });
        results.push({ platform, destination, type: publishType, status: "published", postId });
      } catch (err: any) {
        console.error(`[RealEstate Publish Error] ${platform}/${destination}:`, err.message);
        const detail = err.response?.data?.error?.message || err.message;
        const subcode = err.response?.data?.error?.error_subcode ? ` (subcode: ${err.response.data.error.error_subcode})` : "";
        
        await prisma.propertyPublication.update({
          where: { id: publication.id },
          data: { status: "failed", errorLog: `${detail}${subcode}` },
        });
        results.push({ platform, destination, status: "failed", error: `${detail}${subcode}` });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Publish execution error:", error.message);
    return NextResponse.json({ error: "Publishing failed" }, { status: 500 });
  }
}
