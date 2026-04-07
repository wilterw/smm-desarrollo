import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/webm", "video/quicktime",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    // Create upload directory if it doesn't exist
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique filename
    const ext = file.name.split(".").pop() || "bin";
    const filename = `${randomUUID()}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Determine media type
    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    // Generate absolute URL for Meta API compatibility
    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get("host")}`;
    const absoluteUrl = `${baseUrl}/uploads/${filename}`;

    return NextResponse.json({
      url: `/api/media/${filename}`,
      relativeUrl: `/api/media/${filename}`,
      mediaType,
      originalName: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Upload error:", error?.message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
