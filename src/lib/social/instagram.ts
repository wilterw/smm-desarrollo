/**
 * Instagram Graph API connector
 * Instagram publishing works through Facebook's API (same app)
 *
 * Flow: Upload media container → Publish container
 */

const FB_GRAPH_URL = "https://graph.facebook.com/v25.0";

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
    // Step 1: Create container using JSON body
    const res = await fetch(`${FB_GRAPH_URL}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: accessToken,
      }),
    });
    const containerData = await res.json();
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
    // SMM 3.1: JSON body para Reels
    const res = await fetch(`${FB_GRAPH_URL}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption: caption,
        access_token: accessToken,
      }),
    });
    const containerData = await res.json();
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
    if (!mediaUrl || mediaUrl.trim() === "" || mediaUrl.endsWith("/")) {
      return { success: false, error: `SMM 3.1: URI de multimedia inválida o vacía: "${mediaUrl}". Verifica que la URL sea válida y apunte a un recurso accesible.` };
    }

    const body: any = {
      access_token: accessToken,
    };
    if (mediaType === "video") {
      body.media_type = "VIDEO";
      body.video_url = mediaUrl;
    } else {
      body.image_url = mediaUrl;
    }

    const res = await fetch(`${FB_GRAPH_URL}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const containerData = await res.json();
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

/**
 * Publish a Carousel (Multi-photo/video) to Instagram
 */
export async function publishCarouselToInstagram(
  igAccountId: string,
  accessToken: string,
  mediaItems: { url: string; type: "image" | "video" }[],
  caption: string
): Promise<InstagramPublishResult> {
  try {
    const childrenIds: string[] = [];

    // Step 1: Create a container for each item using JSON body
    for (const item of mediaItems) {
      const isVideo = item.type === "video";
      const body: any = {
        is_carousel_item: true,
        access_token: accessToken,
      };
      
      if (isVideo) {
        body.media_type = "VIDEO";
        body.video_url = item.url;
      } else {
        body.image_url = item.url;
      }

      const res = await fetch(`${FB_GRAPH_URL}/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(`Error creando item: ${data.error.message}`);
      childrenIds.push(data.id);
    }

    // Step 2: Create the carousel container
    const carouselRes = await fetch(`${FB_GRAPH_URL}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        children: childrenIds.join(","),
        caption,
        access_token: accessToken,
      }),
    });
    const carouselData = await carouselRes.json();
    if (carouselData.error) throw new Error(`Error creando carrusel: ${carouselData.error.message}`);

    // Step 3: Publish the carousel
    const publishRes = await fetch(`${FB_GRAPH_URL}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: carouselData.id,
        access_token: accessToken,
      }),
    });
    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(`Error publicando carrusel: ${publishData.error.message}`);

    return { success: true, postId: publishData.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
