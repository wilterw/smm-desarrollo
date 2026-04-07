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
 * Poll the Instagram Graph API to wait until a media container (especially video) is FINISHED processing.
 */
async function waitForInstagramMediaReady(containerId: string, accessToken: string, maxAttempts = 30): Promise<{ success: boolean; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${FB_GRAPH_URL}/${containerId}?fields=status_code,status&access_token=${accessToken}`);
    const data = await res.json();
    
    if (data.status_code === "FINISHED") {
      return { success: true };
    }
    if (data.status_code === "ERROR") {
      console.error("[IG_POLL] Error status_code:", data);
      // Meta returns further details in the `status` field sometimes
      const errorMessage = data.status || "Meta API rechazó el video por formato inválido o URL inaccesible.";
      return { success: false, error: `Error de Meta API: ${errorMessage}` };
    }
    if (data.error) {
      return { success: false, error: data.error.message || "Error al consultar estado" };
    }
    
    // Status is IN_PROGRESS. Wait 4 seconds before polling again.
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
  return { success: false, error: "El procesamiento del video excedió los 2 minutos límite de Meta." };
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

    // Esperar a que el video termine de procesarse en Instagram
    const pollResult = await waitForInstagramMediaReady(containerData.id, accessToken);
    if (!pollResult.success) {
      return { success: false, error: pollResult.error || "Fallo en validación multimedia" };
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
      media_type: "STORIES",
      access_token: accessToken,
    };
    if (mediaType === "video") {
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

    // Esperar a que el medio esté procesado (especialmente si es video)
    if (mediaType === "video") {
      const pollResult = await waitForInstagramMediaReady(containerData.id, accessToken);
      if (!pollResult.success) {
        return { success: false, error: pollResult.error || "Fallo en validación multimedia" };
      }
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
      
      // Esperar si es video
      if (isVideo) {
        const pollResult = await waitForInstagramMediaReady(data.id, accessToken);
        if (!pollResult.success) throw new Error(pollResult.error || "Fallo validando video del carrusel");
      }
      
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

    // Wait for the carousel container to be ready
    const pollResultCarousel = await waitForInstagramMediaReady(carouselData.id, accessToken);
    if (!pollResultCarousel.success) throw new Error(pollResultCarousel.error || "Fallo validando carrusel principal");

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
