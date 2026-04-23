import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import fs from "fs";

/**
 * Resolve clean filename, content type, and file path from the route params
 */
function resolveFile(filename: string) {
  const cleanFilename = filename.split("?")[0];
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filepath = path.join(uploadDir, cleanFilename);

  const ext = cleanFilename.split(".").pop()?.toLowerCase() || "";
  const contentTypeMap: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };
  const contentType = contentTypeMap[ext] || "application/octet-stream";

  return { cleanFilename, filepath, contentType };
}

/**
 * Common CORS + caching headers that Meta's crawler needs to accept the response
 */
function metaHeaders(contentType: string, size: number, filename: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Content-Length": size.toString(),
    "Content-Disposition": `inline; filename="${filename}"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "X-Content-Type-Options": "nosniff",
  };
}

/**
 * HEAD — Meta's crawler sends a HEAD request first to verify the media URL
 * is reachable and returns a valid Content-Type before attempting to download.
 */
export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const { cleanFilename, filepath, contentType } = resolveFile(filename);

    if (!fs.existsSync(filepath)) {
      return new NextResponse(null, { status: 404 });
    }

    const fileStat = await stat(filepath);

    return new NextResponse(null, {
      status: 200,
      headers: metaHeaders(contentType, fileStat.size, cleanFilename),
    });
  } catch (error) {
    console.error("Error HEAD media:", error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * OPTIONS — CORS preflight for Meta's crawler
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * GET — Serve the actual file bytes
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const { cleanFilename, filepath, contentType } = resolveFile(filename);

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const fileBuffer = await readFile(filepath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: metaHeaders(contentType, fileBuffer.byteLength, cleanFilename),
    });
  } catch (error) {
    console.error("Error serving media:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
