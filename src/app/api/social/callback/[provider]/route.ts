import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exchangeFacebookToken, getFacebookPages, getFacebookAdAccounts } from "@/lib/social/facebook";
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

  // Stable redirectUri using NEXTAUTH_URL as priority - Defined at the top to avoid TDZ
  const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/social/callback/${provider}`;

  if (!session) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state"); // Is it "facebook" or "instagram"?
    const intendedProvider = state === "instagram" ? "instagram" : "facebook";

    if (!code) {
      return NextResponse.redirect(new URL("/settings/accounts?error=missing_code", baseUrl));
    }

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
      let adAccountId: string | null = null;

      if (provider === "facebook") {
        const tokens = await exchangeFacebookToken(code, redirectUri);
        accessToken = tokens.accessToken; // User Access Token
        expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

        // Get user's Facebook profile
        const meRes = await fetch(`https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${accessToken}`);
        const meData = await meRes.json();
        const userId = meData.id;
        const userName = meData.name;

        // 0. Fetch Ad Accounts (User level) - Only focus if we want ads/facebook
        if (intendedProvider === "facebook") {
          try {
            const adAccounts = await getFacebookAdAccounts(accessToken);
            const activeAdAccount = adAccounts.find(a => a.account_status === 1);
            if (activeAdAccount) adAccountId = activeAdAccount.id;
            else if (adAccounts.length > 0) adAccountId = adAccounts[0].id;
          } catch (e: any) {
            console.error("[FB_CALLBACK] Ad Accounts error:", e.message);
          }
        }

        // 1. Fetch ALL Facebook Pages (which now includes Instagram accounts)
        const pages = await getFacebookPages(accessToken);
        
        if (pages && pages.length > 0) {
          for (const page of pages) {
            // Save as FACEBOOK provider if intended
            if (intendedProvider === "facebook") {
              await prisma.socialAccount.upsert({
                where: {
                  provider_providerAccountId: {
                    provider: "facebook",
                    providerAccountId: page.id,
                  },
                },
                update: {
                  userId: session.user.id,
                  accessToken: page.access_token,
                  expiresAt,
                  accountName: userName,
                  pageId: page.id,
                  pageName: page.name,
                  igAccountId: page.instagram_business_account?.id || null,
                  adAccountId,
                },
                create: {
                  userId: session.user.id,
                  provider: "facebook",
                  providerAccountId: page.id,
                  accessToken: page.access_token,
                  expiresAt,
                  accountName: userName,
                  pageId: page.id,
                  pageName: page.name,
                  igAccountId: page.instagram_business_account?.id || null,
                  adAccountId,
                },
              });
            }

            // Save as INSTAGRAM provider if it has a linked IG account
            if (page.instagram_business_account) {
              const ig = page.instagram_business_account;
              await prisma.socialAccount.upsert({
                where: {
                  provider_providerAccountId: {
                    provider: "instagram",
                    providerAccountId: ig.id,
                  },
                },
                update: {
                  userId: session.user.id,
                  accessToken: page.access_token, // IG Graph API uses Page Token or User Token
                  expiresAt,
                  accountName: ig.username || ig.name || "Instagram Account",
                  pageId: page.id,
                  pageName: page.name,
                  igAccountId: ig.id,
                  adAccountId,
                },
                create: {
                  userId: session.user.id,
                  provider: "instagram",
                  providerAccountId: ig.id,
                  accessToken: page.access_token,
                  expiresAt,
                  accountName: ig.username || ig.name || "Instagram Account",
                  pageId: page.id,
                  pageName: page.name,
                  igAccountId: ig.id,
                  adAccountId,
                },
              });
            }
          }
        }
        
        // Finalize for the Titular User profile
        providerAccountId = userId;
        accountName = userName;
        // The provider for the final common upsert will be "facebook" (Titular)
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
      return NextResponse.redirect(new URL("/settings/accounts?error=invalid_provider", baseUrl));
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
      } as any
    }) as any;

    if (!user) {
      return NextResponse.redirect(new URL("/settings/accounts?error=user_not_found", baseUrl));
    }

    // 2. Enforce limits per platform
    // NOTE: For multi-page FB, we might want to skip stricter limits or count pages.
    // For now, we apply the logic if we reached this point (single account case).
    const platformAccounts = (user.socialAccounts || []).filter((a: any) => a.provider === provider);
    const existingThisAccount = platformAccounts.find((a: any) => a.providerAccountId === providerAccountId);

    if (!existingThisAccount) {
      if (provider === "facebook") {
        const fbCount = (user.socialAccounts || []).filter((a: any) => a.provider === "facebook").length;
        const fbLimit = user.maxFacebookAccounts || 1;
        if (fbCount >= fbLimit) {
          return NextResponse.redirect(new URL(`/settings/accounts?error=Has alcanzado el límite de ${fbLimit} cuentas de Facebook.`, baseUrl));
        }
      } else if (provider === "youtube") {
        const ytCount = (user.socialAccounts || []).filter((a: any) => a.provider === "youtube").length;
        const ytLimit = user.maxYouTubeAccounts || 1;
        if (ytCount >= ytLimit) {
          return NextResponse.redirect(new URL(`/settings/accounts?error=Has alcanzado el límite de ${ytLimit} cuentas de YouTube.`, baseUrl));
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
        userId: session.user.id,
        accessToken,
        refreshToken,
        expiresAt,
        accountName,
        pageId,
        pageName,
        igAccountId,
        adAccountId,
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
        adAccountId,
      },
    });

    return NextResponse.json({ success: true }); // We usually redirect, but let's stick to the flow
  } catch (error: any) {
    console.error(`OAuth callback error (${provider}):`, error.message);
    return NextResponse.redirect(
      new URL(`/settings/accounts?error=${encodeURIComponent(error.message)}`, baseUrl)
    );
  } finally {
    // Standard finally if needed, usually we redirect in try/catch
    return NextResponse.redirect(new URL("/settings/accounts?success=true", baseUrl));
  }
}
