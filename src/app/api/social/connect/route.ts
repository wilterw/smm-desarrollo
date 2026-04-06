import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFacebookOAuthUrl } from "@/lib/social/facebook";
import { getYouTubeOAuthUrl } from "@/lib/social/youtube";

/**
 * GET /api/social/connect?provider=facebook|youtube
 * Returns the OAuth URL to redirect the user to
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = req.nextUrl.searchParams.get("provider");
  
  // Use NEXTAUTH_URL as priority for stable redirects in production
  const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/social/callback/${provider}`;

  try {
    let oauthUrl: string;

    switch (provider) {
      case "facebook":
      case "instagram":
        oauthUrl = getFacebookOAuthUrl(redirectUri, provider);
        break;
      case "youtube":
        oauthUrl = getYouTubeOAuthUrl(redirectUri);
        break;
      default:
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    return NextResponse.json({ url: oauthUrl });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate OAuth URL" },
      { status: 500 }
    );
  }
}
