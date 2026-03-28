import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAndDecodeSignedRequest } from "@/lib/social/facebook";

/**
 * Meta (Facebook) Data Deletion Callback
 * This endpoint is called automatically by Meta when a user requests 
 * that their data be deleted from our application.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const signedRequest = formData.get("signed_request") as string;

    if (!signedRequest) {
      return NextResponse.json({ error: "No signed_request provided" }, { status: 400 });
    }

    // Decode and verify the request using our Facebook utility
    const data = verifyAndDecodeSignedRequest(signedRequest);
    const facebookUserId = data.user_id;

    if (!facebookUserId) {
      return NextResponse.json({ error: "Invalid payload: user_id missing" }, { status: 400 });
    }

    // Find and delete the social account associated with this Facebook User ID
    // In our schema, providerAccountId stores the unique ID from the platform
    const deleted = await prisma.socialAccount.deleteMany({
      where: {
        provider: "facebook",
        providerAccountId: facebookUserId,
      },
    });

    console.log(`[META COMPLIANCE] Data deletion processed for Facebook user ${facebookUserId}. Records removed: ${deleted.count}`);

    // Generate a confirmation code for Meta's tracking
    const confirmationCode = `del_${Date.now()}_${facebookUserId.slice(-6)}`;
    
    // The status URL must be publicly accessible
    const baseUrl = process.env.NEXTAUTH_URL || 'https://econos-smm.es';
    const statusUrl = `${baseUrl}/api/social/data-deletion/status?id=${confirmationCode}`;

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error: any) {
    console.error("[META COMPLIANCE] Data deletion error:", error.message);
    return NextResponse.json({ error: "Internal server error during data deletion" }, { status: 500 });
  }
}
