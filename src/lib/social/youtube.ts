/**
 * YouTube Data API v3 connector
 * Handles video uploads to YouTube
 *
 * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in .env
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YT_API_URL = "https://www.googleapis.com/youtube/v3";

interface YouTubePublishResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

/**
 * Get the OAuth URL to connect a YouTube/Google account
 */
export function getYouTubeOAuthUrl(redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");

  const scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/adwords",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens
 */
export async function exchangeYouTubeToken(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google credentials not configured");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshYouTubeToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google credentials not configured");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description);
  return data.access_token;
}

/**
 * Upload a video to YouTube (resumable upload)
 * Note: For production, use resumable upload for large files
 */
export async function publishToYouTube(
  accessToken: string,
  title: string,
  description: string,
  videoBuffer: Buffer
): Promise<YouTubePublishResult> {
  try {
    // Truncate title to 100 chars (YouTube limit)
    const sanitizedTitle = title.substring(0, 100).trim() || "Video de SMM";
    // Truncate description to 5000 chars (YouTube limit)
    const sanitizedDescription = description.substring(0, 5000);

    // Step 1: Create the video resource (initiate resumable upload)
    const metadataRes = await fetch(
      `${YT_API_URL}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "video/*",
          "X-Upload-Content-Length": videoBuffer.length.toString(),
        },
        body: JSON.stringify({
          snippet: { 
            title: sanitizedTitle, 
            description: sanitizedDescription,
            categoryId: "22" 
          },
          status: { 
            privacyStatus: "public",
            selfDeclaredMadeForKids: false
          },
        }),
      }
    );

    const uploadUrl = metadataRes.headers.get("location");
    if (!uploadUrl) {
      const errData = await metadataRes.json();
      return { success: false, error: errData?.error?.message || "Failed to initiate upload" };
    }

    // Step 2: Upload the video content
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/*",
        "Content-Length": videoBuffer.length.toString(),
      },
      body: new Uint8Array(videoBuffer),
    });

    const uploadData = await uploadRes.json();
    if (uploadData.error) return { success: false, error: uploadData.error.message };

    return { success: true, videoId: uploadData.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Upload a video to YouTube Shorts
 */
export async function publishToYouTubeShorts(
  accessToken: string,
  title: string,
  description: string,
  videoBuffer: Buffer
): Promise<YouTubePublishResult> {
  // Shorts are recognized by the #Shorts hashtag in title or description
  const shortDescription = description.includes("#Shorts") 
    ? description 
    : `${description}\n\n#Shorts`;
    
  return publishToYouTube(accessToken, title, shortDescription, videoBuffer);
}
