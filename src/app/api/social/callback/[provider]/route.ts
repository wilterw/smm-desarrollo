import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exchangeFacebookToken, getFacebookPages } from "@/lib/social/facebook";
import { getInstagramAccountId } from "@/lib/social/instagram";
import { exchangeYouTubeToken } from "@/lib/social/youtube";

/**
 * GET /api/social/callback/[provider]?code=xxxxx
 * Handles the OAuth callback from Facebook or YouTube
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/settings/accounts?error=missing_code", req.url));
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/social/callback/${provider}`;

  try {
    let accessToken = "";
    let refreshToken: string | null = null;
    let expiresAt: Date | null = null;
    let providerAccountId = "";
    
    // New fields
    let accountName: string | null = null;
    let pageId: string | null = null;
    let pageName: string | null = null;
    let igAccountId: string | null = null;

    if (provider === "facebook") {
      const tokens = await exchangeFacebookToken(code, redirectUri);
      accessToken = tokens.accessToken;
      expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

      // Get user's Facebook profile
      const meRes = await fetch(`https://graph.facebook.com/v24.0/me?fields=id,name&access_token=${accessToken}`);
      const meData = await meRes.json();
      providerAccountId = meData.id;
      accountName = meData.name;

      // Automatically fetch the first Facebook Page and its connected Instagram Account
      try {
        const pages = await getFacebookPages(accessToken);
        if (pages && pages.length > 0) {
          const firstPage = pages[0];
          pageId = firstPage.id;
          pageName = firstPage.name;

          // Try to get IG Business Account ID
          const igId = await getInstagramAccountId(firstPage.id, firstPage.access_token);
          if (igId) {
            igAccountId = igId;
          }
        }
      } catch (e) {
        console.log("Could not fetch Facebook pages or IG account during OAuth", e);
      }
      
    } else if (provider === "youtube") {
      const tokens = await exchangeYouTubeToken(code, redirectUri);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

      // Get user's Google ID & Name
      const meRes = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
      const meData = await meRes.json();
      providerAccountId = meData.id;
      accountName = meData.name || null;
      
    } else {
      return NextResponse.redirect(new URL("/settings/accounts?error=invalid_provider", req.url));
    }

    // 1. Fetch user to check limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        maxFacebookAccounts: true,
        maxInstagramAccounts: true,
        maxYouTubeAccounts: true,
        socialAccounts: true,
      }
    }) as any;

    if (!user) {
      return NextResponse.redirect(new URL("/settings/accounts?error=user_not_found", req.url));
    }

    // 2. Enforce limits per platform
    const platformAccounts = (user.socialAccounts || []).filter((a: any) => a.provider === provider);
    const existingThisAccount = platformAccounts.find((a: any) => a.providerAccountId === providerAccountId);

    if (!existingThisAccount) {
      if (provider === "facebook") {
        const fbCount = (user.socialAccounts || []).filter((a: any) => a.provider === "facebook").length;
        const fbLimit = user.maxFacebookAccounts || 1;
        if (fbCount >= fbLimit) {
          return NextResponse.redirect(new URL(`/settings/accounts?error=Has alcanzado el límite de ${fbLimit} cuentas de Facebook.`, req.url));
        }

        // If this connection includes an Instagram account, check IG limit too
        if (igAccountId) {
          const igCount = (user.socialAccounts || []).filter((a: any) => a.igAccountId !== null).length;
          const igLimit = user.maxInstagramAccounts || 1;
          if (igCount >= igLimit) {
            // Option: We could still allow FB but strip IG, but for now we block as requested
            return NextResponse.redirect(new URL(`/settings/accounts?error=Has alcanzado el límite de ${igLimit} cuentas de Instagram.`, req.url));
          }
        }
      } else if (provider === "youtube") {
        const ytCount = (user.socialAccounts || []).filter((a: any) => a.provider === "youtube").length;
        const ytLimit = user.maxYouTubeAccounts || 1;
        if (ytCount >= ytLimit) {
          return NextResponse.redirect(new URL(`/settings/accounts?error=Has alcanzado el límite de ${ytLimit} cuentas de YouTube.`, req.url));
        }
      }
    }

    // 3. Upsert the social account using provider & providerAccountId
    await prisma.socialAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: provider,
          providerAccountId: providerAccountId,
        },
      },
      update: {
        userId: session.user.id, // Update owner in case someone else claimed it previously (optional policy)
        accessToken,
        refreshToken,
        expiresAt,
        accountName,
        pageId,
        pageName,
        igAccountId,
      },
      create: {
        userId: session.user.id,
        provider,
        providerAccountId,
        accessToken,
        refreshToken,
        expiresAt,
        accountName,
        pageId,
        pageName,
        igAccountId,
      },
    });

    return NextResponse.redirect(new URL("/settings/accounts?success=true", req.url));
  } catch (error: any) {
    console.error(`OAuth callback error (${provider}):`, error.message);
    return NextResponse.redirect(
      new URL(`/settings/accounts?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }
}
