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
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`);
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

    // Upsert the social account enforcing 1 account per platform per user
    await prisma.socialAccount.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: provider,
        },
      },
      update: {
        providerAccountId,
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
