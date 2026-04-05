/**
 * Facebook Graph API connector
 * Handles publishing to Facebook Pages and Instagram
 *
 * Requires: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET in .env
 * User must connect their Facebook account via OAuth to get an access token
 */

const FB_GRAPH_URL = "https://graph.facebook.com/v25.0";

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
    "ads_read",
    "read_insights",
    "business_management"
  ].join(",");

  return `https://www.facebook.com/v25.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
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
 * Get the user's Ad Accounts
 */
export async function getFacebookAdAccounts(accessToken: string) {
  const res = await fetch(`${FB_GRAPH_URL}/me/adaccounts?fields=name,account_id,id,account_status&access_token=${accessToken}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data as { id: string; name: string; account_id: string; account_status: number }[];
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
    if (data.error) {
      const errorMsg = data.error.error_user_msg || data.error.message || "Unknown error";
      return { success: false, error: errorMsg };
    }
    return { success: true, postId: data.id || data.post_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Publish multiple photos to a Facebook Page (Album/Carousel style)
 */
export async function publishMultiPhotoToFacebook(
  pageId: string,
  pageAccessToken: string,
  message: string,
  imageUrls: string[]
): Promise<FacebookPublishResult> {
  try {
    const photoIds: string[] = [];

    // Step 1: Upload each photo as unpublished
    for (const url of imageUrls) {
      const res = await fetch(`${FB_GRAPH_URL}/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          published: false,
          access_token: pageAccessToken,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(`Error subiendo imagen: ${data.error.message}`);
      photoIds.push(data.id);
    }

    // Step 2: Create the feed post with attached media
    const attached_media = photoIds.map(id => ({ media_fbid: id }));
    console.log(`[FB_GRAPH] Attaching ${attached_media.length} photos to ${pageId}/feed`);

    const res = await fetch(`${FB_GRAPH_URL}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        attached_media,
        access_token: pageAccessToken,
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(`Error creando post: ${data.error.message}`);

    return { success: true, postId: data.id };
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
    if (data.error) {
      const errorMsg = data.error.error_user_msg || data.error.message || "Unknown error";
      return { success: false, error: errorMsg };
    }
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
  adAccountId: string | undefined,
  name: string,
  dailyBudget: number,
  objective: string = "OUTCOME_TRAFFIC"
): Promise<FacebookPublishResult> {
  if (!adAccountId) {
    return { success: false, error: "No Ad Account ID provided. Connecting Facebook Ads requires a configured Business Manager." };
  }

  try {
    const objectiveMapping: any = { 'MESSAGES': 'OUTCOME_ENGAGEMENT' };
    const adjObjective = objectiveMapping[objective] || objective || "OUTCOME_TRAFFIC";

    const campaignEndpoint = `${FB_GRAPH_URL}/${adAccountId}/campaigns`;
    const res = await fetch(campaignEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        objective: adjObjective,
        status: "PAUSED",
        special_ad_categories: ["HOUSING"],
        special_ad_category_country: ["ES", "US"],
        is_adset_budget_sharing_enabled: false,
        access_token: userAccessToken,
      }),
    });

    const data = await res.json();
    if (data.error) {
      const errorMsg = data.error.error_user_msg || data.error.message || "Unknown error";
      return { success: false, error: errorMsg };
    }
    
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
  targeting: {
    country: string;
    radiusKm?: number;
    ageMin: number;
    ageMax: number;
    gender: string; 
    interests?: { id: string, name?: string }[];
    locations?: { key: string, name?: string }[];
    customAudiences?: string[];
    publisherPlatforms?: string[];
    objective?: string;
    optimization_goal?: string;
  },
  dailyBudget?: number
): Promise<FacebookPublishResult> {
  try {
    const endpoint = `${FB_GRAPH_URL}/${adAccountId}/adsets`;
    
    // Budget handling
    const budgetParam = dailyBudget ? { daily_budget: Math.round(dailyBudget * 100) } : { lifetime_budget: 10000 };

    const targeting_spec: any = {
      geo_locations: {},
    };

    // Locations (Multi-City + Radius for Housing)
    if (targeting.locations && targeting.locations.length > 0) {
      targeting_spec.geo_locations.cities = targeting.locations.map(loc => ({
        key: loc.key,
        radius: Math.max(targeting.radiusKm || 25, 25),
        distance_unit: "kilometer"
      }));
    } else {
      targeting_spec.geo_locations.countries = [targeting.country || "US"];
    }

    // Age & Gender (Fixed for Housing)
    targeting_spec.age_min = 18;
    targeting_spec.age_max = 65;

    // Interests (Detailed Targeting)
    if (targeting.interests && targeting.interests.length > 0) {
      targeting_spec.flexible_spec = [{
        interests: targeting.interests.map(int => ({ id: int.id, name: int.name || int.id }))
      }];
    }

    // Placements (Advantage+ Placements by default if not specified)
    if (targeting.publisherPlatforms && targeting.publisherPlatforms.length > 0) {
      targeting_spec.publisher_platforms = targeting.publisherPlatforms;
    }

    const body: any = {
      name,
      campaign_id: campaignId,
      ...budgetParam,
      billing_event: "IMPRESSIONS",
      optimization_goal: targeting.optimization_goal || "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: targeting_spec,
      status: "PAUSED",
      access_token: userAccessToken,
    };

    // ODAX mapping for Engagement (Messages)
    if (targeting.objective === 'OUTCOME_ENGAGEMENT') {
      body.optimization_goal = "REPLIES";
      body.destination_type = targeting.publisherPlatforms?.includes('instagram') ? "INSTAGRAM_DIRECT" : "MESSENGER";
    } else if (targeting.objective === 'OUTCOME_AWARENESS') {
      body.optimization_goal = "REACH";
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.error) {
      const errorMsg = data.error.error_user_msg || data.error.message || "Unknown error";
      return { success: false, error: errorMsg };
    }
    return { success: true, postId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Uploads an image to the Ad Account's image library to get an image_hash
 */
export async function uploadFacebookAdImage(
  userAccessToken: string,
  adAccountId: string,
  imageUrl: string
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const endpoint = `${FB_GRAPH_URL}/${adAccountId}/adimages`;
    
    // Step 1: Download the image to our server first (more robust than giving Meta a URL)
    const imageRes = await fetch(imageUrl);
    const imageBlob = await imageRes.blob();
    
    // Step 2: Create a FormData object for the multipart upload
    const formData = new FormData();
    formData.append("access_token", userAccessToken);
    
    // Meta expects a file field, usually named bytes or the filename
    const filename = imageUrl.split("/").pop() || "ad-image.jpg";
    formData.append("filename", new File([imageBlob], filename, { type: imageBlob.type }));

    // Step 3: Perform the upload
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData
    });
    
    const data = await res.json();
    
    if (data.error || !data.images) {
      return { success: false, error: data.error?.message || "Failed to upload image as multipart" };
    }
    
    const firstKey = Object.keys(data.images)[0];
    const hash = data.images[firstKey].hash;
    
    return { success: true, hash };
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
  imageHash: string,
  linkUrl?: string,
  adsConfig?: any,
  instagramActorId?: string
): Promise<FacebookPublishResult> {
  try {
    const endpoint = `${FB_GRAPH_URL}/${adAccountId}/adcreatives`;
    
    const object_story_spec: any = {
      page_id: pageId,
      instagram_actor_id: instagramActorId || undefined,
      link_data: {
        message,
        link: linkUrl || "https://econos.es",
        image_hash: imageHash,
        caption: name,
        call_to_action: {
          type: adsConfig?.ctaLabel || "LEARN_MORE",
          value: {
             link: linkUrl || "https://econos.es"
          }
        }
      }
    };

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
    if (data.error) {
      const errorMsg = data.error.error_user_msg || data.error.message || "Unknown error";
      return { success: false, error: errorMsg };
    }
    return { success: true, postId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Creates a Carousel Ad Creative with multiple child attachments
 */
export async function createFacebookAdCarouselCreative(
  userAccessToken: string,
  adAccountId: string,
  pageId: string,
  name: string,
  message: string,
  imageHashes: string[],
  linkUrl?: string,
  adsConfig?: any,
  instagramActorId?: string
): Promise<FacebookPublishResult> {
  try {
    const endpoint = `${FB_GRAPH_URL}/${adAccountId}/adcreatives`;
    const finalLink = linkUrl || "https://econos.es";

    // Create child attachments for each hash
    const child_attachments = imageHashes.slice(0, 10).map((hash, index) => ({
      link: finalLink,
      image_hash: hash,
      name: `${name} ${index + 1}`,
      call_to_action: {
        type: adsConfig?.ctaLabel || "LEARN_MORE",
        value: { link: finalLink }
      }
    }));

    const object_story_spec: any = {
      page_id: pageId,
      instagram_actor_id: instagramActorId || undefined,
      link_data: {
        message,
        link: finalLink,
        child_attachments,
        multi_share_optimized: true,
        multi_share_end_card: false,
        call_to_action: {
           type: adsConfig?.ctaLabel || "LEARN_MORE",
           value: { link: finalLink }
        }
      }
    };

    const body = {
      name: `Carousel - ${name}`,
      object_story_spec,
      access_token: userAccessToken,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.error) {
      const errorMsg = data.error.error_user_msg || data.error.message || "Unknown error";
      return { success: false, error: errorMsg };
    }
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
    if (data.error) {
      const errorMsg = data.error.error_user_msg || data.error.message || "Unknown error";
      return { success: false, error: errorMsg };
    }
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


