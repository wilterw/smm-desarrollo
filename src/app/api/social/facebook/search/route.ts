import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const FB_GRAPH_URL = "https://graph.facebook.com/v25.0";

/**
 * GET /api/social/facebook/search
 * Query params: type (adinterest | adgeolocation), q (search term), accessToken
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // 'adinterest' or 'adgeolocation'
  const q = searchParams.get("q");
  const accessToken = searchParams.get("accessToken");

  if (!type || !q || !accessToken) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    let endpoint = `${FB_GRAPH_URL}/search?type=${type}&q=${encodeURIComponent(q)}&access_token=${accessToken}`;
    
    if (type === 'adgeolocation') {
      endpoint += '&location_types=["city"]';
    }

    const res = await fetch(endpoint);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json(data.data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
