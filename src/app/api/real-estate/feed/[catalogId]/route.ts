import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function escapeXml(unsafe: string) {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { catalogId: string } }
) {
  try {
    const catalog = await prisma.propertyCatalog.findUnique({
      where: { id: params.catalogId },
      include: {
        properties: {
           // We only include properties that are not drafts or errors natively,
           // or we include all and let Meta read their availability.
           // Meta standard dictates that all active listings should be given.
           where: { syncStatus: { not: "draft" } }
        }
      }
    });

    if (!catalog) {
      return new NextResponse("Catalog not found", { status: 404 });
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<listings>\n`;

    for (const prop of catalog.properties) {
      // Main image
      let imagesXml = `<image><url>${escapeXml(prop.imageUrl)}</url></image>`;
      
      // Parse additional images if present
      if (prop.images) {
         try {
           const extraImages: string[] = JSON.parse(prop.images);
           extraImages.forEach(imgUrl => {
             // To avoid duplication with the main image
             if (imgUrl !== prop.imageUrl) {
                imagesXml += `\n    <image><url>${escapeXml(imgUrl)}</url></image>`;
             }
           });
         } catch(e) {}
      }

      const linkUrl = prop.listingUrl || `https://econos.es/inmuebles/${prop.id}`;

      xml += `  <listing>
    <home_listing_id>${escapeXml(prop.id)}</home_listing_id>
    <name>${escapeXml(prop.name)}</name>
    <availability>${escapeXml(prop.availability)}</availability>
    <description>${escapeXml(prop.description)}</description>
    <price>${prop.price} ${escapeXml(prop.currency)}</price>
    ${imagesXml}
    <address format="simple">
      <component name="addr1">${escapeXml(prop.address || "Dirección a consultar")}</component>
      <component name="city">${escapeXml(prop.city)}</component>
      <component name="country">${escapeXml(prop.country)}</component>
    </address>
    <listing_type>for_sale_by_agent</listing_type>
    <property_type>${escapeXml(prop.propertyType)}</property_type>
    <url>${escapeXml(linkUrl)}</url>
  </listing>\n`;
    }

    xml += `</listings>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        // Evitar cache agresiva para que Meta vea los cambios
        "Cache-Control": "s-maxage=600, stale-while-revalidate=3600"
      }
    });

  } catch (error) {
    console.error("Feed Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
