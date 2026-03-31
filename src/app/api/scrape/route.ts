import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const JUNK_KEYWORDS = ["logo", "icon", "avatar", "placeholder", "spinner", "blank", "badge", "flag", "sprite"];

function isJunk(src: string): boolean {
  const lower = src.toLowerCase();
  return JUNK_KEYWORDS.some(k => lower.includes(k));
}

function cleanTitle(title: string): string {
  let t = title.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
  if (t.includes("|")) t = t.split("|")[0].trim();
  return t;
}

function generateHashtags(parts: string[]): string[] {
  const words: string[] = [];
  for (const part of parts) {
    const split = part
      .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ\-]/gi, "")
      .split(/[\s\-–—]+/)
      .map(w => w.trim())
      .filter(w => w.length > 2);
    words.push(...split);
  }
  const unique = [...new Set(words)];
  return unique.map(w => `#${w.charAt(0).toUpperCase() + w.slice(1)}`);
}

// Extract content from XML tag (handles CDATA and plain values)
function getXmlTag(xml: string, tag: string): string {
  // Try CDATA format first
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const cdataM = xml.match(cdataRe);
  if (cdataM) return cdataM[1].trim();

  // Try plain format
  const plainRe = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const plainM = xml.match(plainRe);
  return plainM ? plainM[1].trim() : "";
}

// ─── MH Estate specific handler ──────────────────────────────────────────────
async function scrapeMHEstate(propertyId: string, originalUrl: string) {
  const xmlUrl = "https://mhestate.es/assets/data/propiedades.xml";
  const xmlRes = await fetch(xmlUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/xml, text/xml, */*",
    },
    // No cache so we always get fresh data
    cache: "no-store",
  });

  if (!xmlRes.ok) throw new Error(`XML fetch failed: ${xmlRes.status}`);
  const xml = await xmlRes.text();

  // Locate the property block by <id> tag (exact match)
  // Search for <id>27603199</id> pattern
  const idSearch = `<id>${propertyId}</id>`;
  const idIdx = xml.indexOf(idSearch);
  if (idIdx === -1) {
    // Try referencia tag as fallback
    const refSearch = `<referencia>${propertyId}</referencia>`;
    const refIdx = xml.indexOf(refSearch);
    if (refIdx === -1) throw new Error(`Property ${propertyId} not found in XML`);
  }

  const blockStart = xml.lastIndexOf("<propiedad", idIdx === -1 
    ? xml.indexOf(`<referencia>${propertyId}</referencia>`) 
    : idIdx);
  const blockEnd = xml.indexOf("</propiedad>", blockStart) + "</propiedad>".length;
  const block = xml.substring(blockStart, blockEnd);

  if (!block || block.length < 10) throw new Error("Could not extract property block");

  // Extract fields using exact tag names confirmed from XML inspection
  const tipoOfer = getXmlTag(block, "tipo_ofer") || getXmlTag(block, "tipo_inmueble") || "Propiedad";
  const zona    = getXmlTag(block, "zona")  || "";
  const ciudad  = getXmlTag(block, "ciudad") || "";
  const titulo1 = getXmlTag(block, "titulo1") || "";

  // Build a clean display title: ALWAYS tipo_ofer - zona (the user wants this format)
  const displayTitle = (tipoOfer && zona) 
    ? `${tipoOfer} - ${zona}` 
    : (tipoOfer || zona || titulo1 || "Propiedad");

  const descrip  = getXmlTag(block, "descrip1") || getXmlTag(block, "descripcion") || "";
  const numfotos = parseInt(getXmlTag(block, "numfotos") || "0", 10) || 15;

  // Clean and truncate description: first meaningful paragraph only (~280 chars)
  let cleanDescrip = descrip.replace(/\s+/g, " ").replace(/~~/g, " ").trim();
  // Truncate at ~280 chars, ending at last full sentence (period or comma)
  if (cleanDescrip.length > 280) {
    const cut = cleanDescrip.substring(0, 280);
    const lastPeriod = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
    const lastComma = cut.lastIndexOf(",");
    const breakPoint = lastPeriod > 150 ? lastPeriod + 1 : (lastComma > 150 ? lastComma : 280);
    cleanDescrip = cut.substring(0, breakPoint).trim();
  }
  const images: string[] = [];
  for (let i = 1; i <= Math.min(numfotos, 20); i++) {
    const fotoUrl = getXmlTag(block, `foto${i}`);
    if (fotoUrl && fotoUrl.startsWith("http") && !isJunk(fotoUrl)) {
      images.push(fotoUrl);
    } else if (!fotoUrl) {
      break;
    }
  }

  // Build hashtags from tipo_ofer + zona + ciudad
  const hashtagParts = [tipoOfer, zona, ciudad].filter(Boolean);
  const hashtags = generateHashtags(hashtagParts);

  return {
    title: cleanTitle(displayTitle).substring(0, 100),
    description: cleanDescrip,
    images,
    hashtags,
    suggestedComment: "📍 Consulta detalles y agenda tu visita. ¡Te asesoramos sin compromiso!",
    linkUrl: originalUrl,
  };
}

// ─── Generic scraper ─────────────────────────────────────────────────────────
async function scrapeGeneric(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();

  const getMeta = (name: string) => {
    const r1 = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i"));
    if (r1) return r1[1];
    const r2 = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`, "i"));
    return r2 ? r2[1] : null;
  };

  let title = getMeta("og:title") || getMeta("twitter:title") || "";
  if (!title) {
    const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = tm ? tm[1] : "";
  }
  title = cleanTitle(title);

  const description = (getMeta("og:description") || getMeta("twitter:description") || getMeta("description") || "")
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

  const images: string[] = [];

  const ogImg = getMeta("og:image") || getMeta("twitter:image");
  if (ogImg && ogImg.startsWith("http") && !isJunk(ogImg)) images.push(ogImg);

  // Only grab absolute .jpg / .jpeg / .png URLs
  const directRegex = /https?:\/\/[^\s"'<>\\]+\.(?:jpg|jpeg|png)(?:\?[^\s"'<>\\]*)?/gi;
  let m: RegExpExecArray | null;
  while ((m = directRegex.exec(html)) !== null && images.length < 50) {
    const src = m[0];
    if (!isJunk(src) && !images.includes(src)) images.push(src);
  }

  // Relative <img src> with .jpg/.png only
  const imgTagRegex = /<img[^>]+(?:src|data-src|data-original)=["']([^"']+\.(?:jpg|jpeg|png)(?:\?[^"']*)?)["'][^>]*>/gi;
  while ((m = imgTagRegex.exec(html)) !== null && images.length < 60) {
    let src = m[1];
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) { try { src = new URL(src, url).href; } catch (_) {} }
    if (src.startsWith("http") && !isJunk(src) && !images.includes(src)) images.push(src);
  }

  const hashtags = generateHashtags([title]);

  return {
    title: title.substring(0, 100),
    description: description.substring(0, 500),
    images,
    hashtags,
    suggestedComment: "📍 Consulta detalles y agenda tu visita. ¡Te asesoramos sin compromiso!",
    linkUrl: url,
  };
}

// ─── Main Route ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { url } = await req.json();
    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    let result;

    // Detector específico: mhestate.es
    const mhMatch = url.match(/mhestate\.es\/propiedad[?&]id=(\d+)/i);
    if (mhMatch) {
      result = await scrapeMHEstate(mhMatch[1], url);
    } else {
      result = await scrapeGeneric(url);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Scrape Error:", error.message);
    return NextResponse.json({ error: `Error: ${error.message}` }, { status: 500 });
  }
}
