/**
 * Facebook Graph API connector
 * Handles publishing to Facebook Pages and Instagram
 *
 * Requires: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET in .env
 * User must connect their Facebook account via OAuth to get an access token
 */

const FB_GRAPH_URL = "https://graph.facebook.com/v24.0";

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

  return `https://www.facebook.com/v24.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
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

/**
 * Verifies and decodes a signed_request from Meta
 * Used for Data Deletion Callbacks
 */
export function verifyAndDecodeSignedRequest(signedRequest: string): any {
  if (!signedRequest) throw new Error("No signed_request provided");
  
  const [encodedSig, payload] = signedRequest.split('.');
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) throw new Error("FACEBOOK_APP_SECRET not configured");

  // Decode signature
  const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
  
  // Create expected signature
  // We use the Hmac from the crypto module
  const crypto = require('crypto');
  const expectedSig = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');

  if (sig !== expectedSig) {
    console.error("Signature mismatch", { sig, expectedSig });
    throw new Error('Invalid signature');
  }

  // Decode payload
  const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  return data;
}

/**
 * Creates an Ad Set within a Campaign
 * Handles targeting (country, age, gender, interests)
 */
export async function createFacebookAdSet(
  userAccessToken: string,
  adAccountId: string,
  campaignId: string,
  name: string,
  dailyBudget: number,
  targeting: {
    country: string;
    ageMin: number;
    ageMax: number;
    gender: string; // "all", "male", "female"
    interests?: string[];
  }
): Promise<FacebookPublishResult> {
  try {
    const endpoint = `${FB_GRAPH_URL}/${adAccountId}/adsets`;
    
    // Process gender to Facebook's numeric format (0=all, 1=male, 2=female)
    const genderMap: Record<string, number[]> = {
      "all": [1, 2],
      "male": [1],
      "female": [2]
    };

    const body: any = {
      name,
      campaign_id: campaignId,
      daily_budget: Math.round(dailyBudget * 100), // Meta expects cents
      billing_event: "IMPRESSIONS",
      optimization_goal: "REACH",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: {
        geo_locations: { countries: [targeting.country] },
        age_min: targeting.ageMin,
        age_max: targeting.ageMax,
        genders: genderMap[targeting.gender] || [1, 2],
      },
      status: "PAUSED",
      access_token: userAccessToken,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, postId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Creates an Ad Creative
 */
export async function createFacebookAdCreative(
  userAccessToken: string,
  adAccountId: string,
  pageId: string,
  name: string,
  message: string,
  imageUrl?: string,
  videoUrl?: string
): Promise<FacebookPublishResult> {
  try {
    const endpoint = `${FB_GRAPH_URL}/${adAccountId}/adcreatives`;
    
    const object_story_spec: any = {
      page_id: pageId,
      link_data: {
        message,
        link: imageUrl || "https://econos.es", // Placeholder link if none provided
        image_hash: "", // In a real scenario, you'd upload and get an image hash
        caption: name,
      }
    };

    // Note: This is a simplified version. Real ads often require uploading media 
    // to get hashes before creating the creative.
    const body: any = {
      name,
      object_story_spec,
      access_token: userAccessToken,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, postId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Creates the final Ad connecting AdSet and Creative
 */
export async function createFacebookAd(
  userAccessToken: string,
  adAccountId: string,
  adSetId: string,
  creativeId: string,
  name: string
): Promise<FacebookPublishResult> {
  try {
    const endpoint = `${FB_GRAPH_URL}/${adAccountId}/ads`;
    
    const body: any = {
      name,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status: "PAUSED",
      access_token: userAccessToken,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, postId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetch insights for an organic post
 */
export async function getFacebookPostInsights(pagePostId: string, accessToken: string) {
  try {
    // Metrics: impressions, reach, engagement
    const endpoint = `${FB_GRAPH_URL}/${pagePostId}/insights?metric=post_impressions_unique,post_engaged_users,post_reactions_by_type_total&access_token=${accessToken}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    
    if (data.error) throw new Error(data.error.message);
    
    // Extract values
    const reach = data.data.find((m: any) => m.name === "post_impressions_unique")?.values[0]?.value || 0;
    const engagement = data.data.find((m: any) => m.name === "post_engaged_users")?.values[0]?.value || 0;
    
    return { success: true, reach, engagement, impressions: reach * 1.2 }; // Estimated impressions
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetch insights for a paid ad
 */
export async function getFacebookAdInsights(adId: string, accessToken: string) {
  try {
    const endpoint = `${FB_GRAPH_URL}/${adId}/insights?fields=impressions,reach,clicks,spend,cpc,ctr&access_token=${accessToken}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    
    if (data.error) throw new Error(data.error.message);
    if (!data.data || data.data.length === 0) return { success: true, reach: 0, clicks: 0, impressions: 0, spend: 0 };
    
    const stats = data.data[0];
    return {
      success: true,
      reach: parseInt(stats.reach || 0),
      clicks: parseInt(stats.clicks || 0),
      impressions: parseInt(stats.impressions || 0),
      spend: parseFloat(stats.spend || 0),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


