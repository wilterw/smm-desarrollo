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
 *
 * IMPORTANT: Unverified Google Cloud projects can ONLY upload videos as "private".
 * Setting privacyStatus to "public" or "unlisted" will return a 400 error.
 * To upload as public, the project must pass Google's compliance audit:
 * https://support.google.com/youtube/contact/yt_api_form
 */
export async function publishToYouTube(
  accessToken: string,
  title: string,
  description: string,
  videoBuffer: Buffer,
  privacyStatus: "private" | "public" | "unlisted" = "private"
): Promise<YouTubePublishResult> {
  try {
    // ── Sanitize Title ──
    // YouTube limits: max 100 chars, no <>, no newlines, no control characters
    let cleanTitle = (title || "")
      .replace(/[\r\n]+/g, " ")          // Replace newlines with spaces
      .replace(/[<>]/g, "")              // Remove angle brackets
      .replace(/[\x00-\x1F\x7F]/g, "")  // Remove control characters
      .substring(0, 100)
      .trim();
    if (!cleanTitle) cleanTitle = "Video de SMM";

    // ── Sanitize Description ──
    // YouTube limits: max 5000 chars, no <>, keep newlines (they're valid in descriptions)
    const cleanDescription = (description || "")
      .replace(/[<>]/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars except \n \r \t
      .substring(0, 5000);

    console.log(`[YouTube API] ═══ Initiating Resumable Upload ═══`);
    console.log(`[YouTube API] Title: "${cleanTitle}" (${cleanTitle.length} chars)`);
    console.log(`[YouTube API] Description length: ${cleanDescription.length} chars`);
    console.log(`[YouTube API] Privacy: ${privacyStatus}`);
    console.log(`[YouTube API] Video size: ${videoBuffer.length} bytes (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    // ── Build Metadata ──
    // CRITICAL: Do NOT include an empty tags array — the YouTube API returns 400 if tags is empty.
    const metadata: any = {
      snippet: {
        title: cleanTitle,
        description: cleanDescription,
        categoryId: "22"  // People & Blogs
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false
      }
    };

    console.log(`[YouTube API] Metadata payload:`, JSON.stringify(metadata, null, 2));

    // Step 1: Initiate resumable upload session
    // MUST use the /upload/ endpoint, not the standard API endpoint
    const UPLOAD_API_URL = "https://www.googleapis.com/upload/youtube/v3";
    const metadataRes = await fetch(
      `${UPLOAD_API_URL}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": videoBuffer.length.toString(),
          "X-Upload-Content-Type": "video/mp4",
        },
        body: JSON.stringify(metadata),
      }
    );

    // If the metadata request itself failed, extract the error
    if (!metadataRes.ok) {
      const errBody = await metadataRes.text();
      console.error(`[YouTube API] ✗ Metadata request failed (HTTP ${metadataRes.status})`);
      console.error(`[YouTube API] Full error response: ${errBody}`);
      try {
        const errJson = JSON.parse(errBody);
        const errMsg = errJson?.error?.message || errJson?.error?.errors?.[0]?.message || errBody;
        const errReason = errJson?.error?.errors?.[0]?.reason || "";
        const errDomain = errJson?.error?.errors?.[0]?.domain || "";
        const errLocation = errJson?.error?.errors?.[0]?.location || "";
        
        let hint = "";
        if (errReason === "badRequest" && privacyStatus !== "private") {
          hint = " HINT: Los proyectos de Google Cloud no verificados solo pueden subir videos como 'private'. Cambia privacyStatus a 'private' o verifica tu proyecto en https://support.google.com/youtube/contact/yt_api_form";
        }
        
        console.error(`[YouTube API] Error details → reason: ${errReason}, domain: ${errDomain}, location: ${errLocation}`);
        return { success: false, error: `YouTube API (${metadataRes.status}): ${errMsg}${errReason ? ` [${errReason}]` : ""}${hint}` };
      } catch {
        return { success: false, error: `YouTube API error (HTTP ${metadataRes.status}): ${errBody.substring(0, 500)}` };
      }
    }

    const uploadUrl = metadataRes.headers.get("location");
    if (!uploadUrl) {
      const resText = await metadataRes.text();
      console.error(`[YouTube API] No upload URL in response. Body: ${resText}`);
      return { success: false, error: "YouTube no devolvió una URL de subida. Respuesta: " + resText.substring(0, 300) };
    }

    console.log(`[YouTube API] ✓ Upload URL obtained. Uploading ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB...`);

    // Step 2: Upload the actual video bytes
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": videoBuffer.length.toString(),
      },
      body: new Uint8Array(videoBuffer),
    });

    const uploadText = await uploadRes.text();
    console.log(`[YouTube API] Upload response (HTTP ${uploadRes.status}): ${uploadText.substring(0, 500)}`);

    if (!uploadRes.ok) {
      try {
        const errJson = JSON.parse(uploadText);
        return { success: false, error: `YouTube upload failed (${uploadRes.status}): ${errJson?.error?.message || uploadText.substring(0, 300)}` };
      } catch {
        return { success: false, error: `YouTube upload failed (HTTP ${uploadRes.status}): ${uploadText.substring(0, 300)}` };
      }
    }

    const uploadData = JSON.parse(uploadText);
    if (uploadData.error) {
      return { success: false, error: uploadData.error.message };
    }

    console.log(`[YouTube API] ✓ Video uploaded successfully! ID: ${uploadData.id}`);
    console.log(`[YouTube API] Watch at: https://www.youtube.com/watch?v=${uploadData.id}`);
    return { success: true, videoId: uploadData.id };
  } catch (error: any) {
    console.error(`[YouTube API] ✗ Exception:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload a video to YouTube Shorts
 * Shorts are recognized by the #Shorts hashtag in title or description
 */
export async function publishToYouTubeShorts(
  accessToken: string,
  title: string,
  description: string,
  videoBuffer: Buffer,
  privacyStatus: "private" | "public" | "unlisted" = "private"
): Promise<YouTubePublishResult> {
  const shortDescription = description.includes("#Shorts") 
    ? description 
    : `${description}\n\n#Shorts`;
    
  return publishToYouTube(accessToken, title, shortDescription, videoBuffer, privacyStatus);
}
