/**
 * Instagram Graph API connector
 * Instagram publishing works through Facebook's API (same app)
 *
 * Flow: Upload media container → Publish container
 */

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

interface InstagramPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Get the Instagram Business Account ID linked to a Facebook Page
 */
export async function getInstagramAccountId(
  pageId: string,
  pageAccessToken: string
): Promise<string | null> {
  const res = await fetch(
    `${FB_GRAPH_URL}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
  );
  const data = await res.json();
  return data?.instagram_business_account?.id || null;
}

/**
 * Publish a photo to Instagram
 * Step 1: Create a media container
 * Step 2: Publish the media container
 */
export async function publishToInstagram(
  igAccountId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<InstagramPublishResult> {
  try {
    // Step 1: Create container
    const containerRes = await fetch(
      `${FB_GRAPH_URL}/${igAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );
    const containerData = await containerRes.json();
    if (containerData.error) {
      const errorMsg = containerData.error.error_user_msg || containerData.error.message || "Unknown error creating container";
      return { success: false, error: errorMsg };
    }

    const containerId = containerData.id;

    // Step 2: Publish container
    const publishRes = await fetch(
      `${FB_GRAPH_URL}/${igAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );
    const data = await publishRes.json();
    if (data.error) {
      const errorMsg = data.error.error_user_msg || data.error.message || "Unknown error publishing";
      return { success: false, error: errorMsg };
    }

    return { success: true, postId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Publish a Reel (Video) to Instagram
 */
export async function publishToInstagramReels(
  igAccountId: string,
  accessToken: string,
  videoUrl: string,
  caption: string
): Promise<InstagramPublishResult> {
  try {
    const containerRes = await fetch(
      `${FB_GRAPH_URL}/${igAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "REELS",
          video_url: videoUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );
    const containerData = await containerRes.json();
    if (containerData.error) {
      const errorMsg = containerData.error.error_user_msg || containerData.error.message || "Unknown error creating reels container";
      return { success: false, error: errorMsg };
    }

    const publishRes = await fetch(
      `${FB_GRAPH_URL}/${igAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken,
        }),
      }
    );
    const publishData = await publishRes.json();
    if (publishData.error) {
      const errorMsg = publishData.error.error_user_msg || publishData.error.message || "Unknown error publishing reel";
      return { success: false, error: errorMsg };
    }

    return { success: true, postId: publishData.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Publish a Story to Instagram
 */
export async function publishToInstagramStories(
  igAccountId: string,
  accessToken: string,
  mediaUrl: string,
  mediaType: "image" | "video"
): Promise<InstagramPublishResult> {
  try {
    const params: any = {
      media_type: "STORIES",
      access_token: accessToken,
    };
    if (mediaType === "video") params.video_url = mediaUrl;
    else params.image_url = mediaUrl;

    const containerRes = await fetch(
      `${FB_GRAPH_URL}/${igAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      }
    );
    const containerData = await containerRes.json();
    if (containerData.error) {
      const errorMsg = containerData.error.error_user_msg || containerData.error.message || "Unknown error creating story container";
      return { success: false, error: errorMsg };
    }

    const publishRes = await fetch(
      `${FB_GRAPH_URL}/${igAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken,
        }),
      }
    );
    const publishData = await publishRes.json();
    if (publishData.error) {
      const errorMsg = publishData.error.error_user_msg || publishData.error.message || "Unknown error publishing story";
      return { success: false, error: errorMsg };
    }

    return { success: true, postId: publishData.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
