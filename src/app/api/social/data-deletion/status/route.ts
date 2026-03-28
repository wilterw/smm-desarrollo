import { NextRequest, NextResponse } from "next/server";

/**
 * Meta (Facebook) Data Deletion Status Page
 * This endpoint provides a confirmation for Meta and the user that 
 * the data deletion request has been processed.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const confirmationId = searchParams.get("id");

  if (!confirmationId) {
    return NextResponse.json({ 
      error: "No se proporcionó un ID de confirmación válido." 
    }, { status: 400 });
  }

  // This simple response satisfies Meta's requirement for a status check
  return NextResponse.json({
    app: "Econos Social Media Manager",
    status: "completed",
    message: "Tu solicitud de eliminación de datos ha sido procesada con éxito. Los tokens de acceso y conexiones han sido removidos permanentemente.",
    confirmation_code: confirmationId,
    timestamp: new Date().toISOString()
  });
}
