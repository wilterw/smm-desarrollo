import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Remueve query parameters falsos si los hay como f=.mp4
    const cleanFilename = filename.split("?")[0];
    
    // Check in the main process working directory
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filepath = path.join(uploadDir, cleanFilename);

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const fileBuffer = await readFile(filepath);
    
    let contentType = "application/octet-stream";
    if (cleanFilename.endsWith(".mp4")) contentType = "video/mp4";
    else if (cleanFilename.endsWith(".webm")) contentType = "video/webm";
    else if (cleanFilename.endsWith(".png")) contentType = "image/png";
    else if (cleanFilename.endsWith(".jpg") || cleanFilename.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (cleanFilename.endsWith(".gif")) contentType = "image/gif";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error serving media:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
