/**
 * Facebook Graph API connector
 * Handles publishing to Facebook Pages and Instagram
 *
 * Requires: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET in .env
 * User must connect their Facebook account via OAuth to get an access token
 */

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

interface FacebookPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Get the OAuth URL to connect a Facebook account
 */
export function getFacebookOAuthUrl(redirectUri: string): string {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) throw new Error("FACEBOOK_APP_ID not configured");

  const scopes = [
    "pages_manage_posts",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_content_publish",
    "ads_management",
    "business_management"
  ].join(",");

  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
}

/**
 * Exchange authorization code for a long-lived access token
 */
export async function exchangeFacebookToken(code: string, redirectUri: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Facebook credentials not configured");

  // Step 1: Exchange code for short-lived token
  const tokenRes = await fetch(
    `${FB_GRAPH_URL}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
  );
  const tokenData = await tokenRes.json();

  if (tokenData.error) throw new Error(tokenData.error.message);

  // Step 2: Exchange short-lived for long-lived token
  const longRes = await fetch(
    `${FB_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
  );
  const longData = await longRes.json();

  return {
    accessToken: longData.access_token,
    expiresIn: longData.expires_in || 5184000, // ~60 days
  };
}

/**
 * Get the user's Facebook Pages (needed for publishing)
 */
export async function getFacebookPages(accessToken: string) {
  const res = await fetch(`${FB_GRAPH_URL}/me/accounts?access_token=${accessToken}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data as { id: string; name: string; access_token: string }[];
}

/**
 * Publish a post to a Facebook Page
 */
export async function publishToFacebook(
  pageId: string,
  pageAccessToken: string,
  message: string,
  imageUrl?: string
): Promise<FacebookPublishResult> {
  try {
    let endpoint = `${FB_GRAPH_URL}/${pageId}/feed`;
    const body: any = { message, access_token: pageAccessToken };

    if (imageUrl) {
      endpoint = `${FB_GRAPH_URL}/${pageId}/photos`;
      body.url = imageUrl;
      body.caption = message;
      delete body.message;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, postId: data.id || data.post_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Publish a post to a User's Personal Feed
 * Note: Facebook restricts this for most apps, but endpoint is /me/feed
 */
export async function publishToFacebookFeed(
  userAccessToken: string,
  message: string,
  imageUrl?: string
): Promise<FacebookPublishResult> {
  try {
    let endpoint = `${FB_GRAPH_URL}/me/feed`;
    const body: any = { message, access_token: userAccessToken };

    if (imageUrl) {
      endpoint = `${FB_GRAPH_URL}/me/photos`;
      body.url = imageUrl;
      body.caption = message;
      delete body.message;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, postId: data.id || data.post_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Creates a basic Ad Campaign in Facebook Ads Manager
 * Note: Requires a valid Ad Account ID linked to the user's Business Manager
 */
export async function createFacebookAdCampaign(
  userAccessToken: string,
  adAccountId: string | undefined, // Usually "act_<account_id>"
  name: string,
  dailyBudget: number,
  objective: string = "OUTCOME_TRAFFIC"
): Promise<FacebookPublishResult> {
  if (!adAccountId) {
    return { success: false, error: "No Ad Account ID provided. Connecting Facebook Ads requires a configured Business Manager." };
  }

  try {
    // Creating the Campaign
    const campaignEndpoint = `${FB_GRAPH_URL}/${adAccountId}/campaigns`;
    const res = await fetch(campaignEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        objective,
        status: "PAUSED",
        special_ad_categories: [],
        access_token: userAccessToken,
      }),
    });

    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    
    // In a real implementation, you would also create an AdSet and an Ad Creative here.
    // For this module, returning the campaign ID as success.
    return { success: true, postId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
