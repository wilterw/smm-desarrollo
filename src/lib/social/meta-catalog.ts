/**
 * Facebook Graph API connector for Advantage+ Catalogs
 * Handles Catalog creation, Feed registration, and Batch API uploads.
 */

const FB_GRAPH_URL = "https://graph.facebook.com/v25.0";

interface MetaCatalogResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Creates a new Catalog in the Business Manager.
 * Type can be "home_listings", "products", "vehicles", etc.
 */
export async function createMetaCatalog(
  businessId: string,
  accessToken: string,
  name: string,
  catalogType: string = "home_listings"
): Promise<MetaCatalogResult> {
  try {
    const endpoint = `${FB_GRAPH_URL}/${businessId}/owned_product_catalogs`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        vertical: catalogType,
        access_token: accessToken,
      }),
    });

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    return { success: true, id: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Registers a Data Feed URL to a Catalog in Meta via Scheduled Uploads.
 */
export async function createMetaFeed(
  catalogId: string,
  accessToken: string,
  feedUrl: string,
  schedule: { interval: "HOURLY" | "DAILY" | "WEEKLY", minute?: number, hour?: number, day?: number } = { interval: "DAILY", hour: 2 }
): Promise<MetaCatalogResult> {
  try {
    const endpoint = `${FB_GRAPH_URL}/${catalogId}/product_feeds`;
    
    // Configura la lectura periódica del XML generado
    const scheduleData: any = { interval: schedule.interval };
    if (schedule.minute !== undefined) scheduleData.minute = schedule.minute;
    if (schedule.hour !== undefined) scheduleData.hour = schedule.hour;
    if (schedule.day !== undefined) scheduleData.day_of_week = schedule.day;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `SMM Auto Feed (${schedule.interval})`,
        schedule: scheduleData,
        update_schedule: scheduleData,
        default_currency: "EUR",
        delimiter: "COMMA", // Para CSV, pero usaremos XML
        access_token: accessToken,
      }),
    });

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error.message };
    }

    // Now set the URL for the feed we just created
    const feedId = data.id;
    const uploadEndpoint = `${FB_GRAPH_URL}/${feedId}`;
    await fetch(uploadEndpoint, {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         file_url: feedUrl,
         access_token: accessToken
       }),
    });

    return { success: true, id: feedId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Executes a Batch Insert/Update directly to the Catalog items.
 * Excellent for immediate reflection in ads.
 */
export async function batchUpsertItems(
  catalogId: string,
  items: any[],
  accessToken: string
): Promise<MetaCatalogResult> {
  try {
    const endpoint = `${FB_GRAPH_URL}/${catalogId}/batch`;
    
    // Formatting requests for the batch API
    const requests = items.map((item) => ({
      method: "POST",
      data: item,
    }));

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests,
        item_type: "home_listing", // Adjust natively if not real estate
        access_token: accessToken,
      }),
    });

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error.message };
    }

    // Batch API returns 'handles' which are async job IDs
    return { success: true, id: data.handles?.[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
