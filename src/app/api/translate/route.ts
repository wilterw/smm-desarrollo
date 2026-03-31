import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function translateText(text: string, targetLangCode: string): Promise<string> {
  if (!text) return "";
  
  // Try to clean text before sending
  const cleanText = text.trim();
  if (!cleanText) return "";

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLangCode}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Translation API failed");
    
    const data = await res.json();
    let translated = "";
    if (data && data[0]) {
      for (let i = 0; i < data[0].length; i++) {
        translated += data[0][i][0];
      }
    }
    return translated || text; // Fallback to original text if failed
  } catch (error) {
    console.error("Translation segment error:", error);
    return text;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, description, firstComment, hashtags, targetLanguage } = await req.json();

    if (!targetLanguage) {
      return NextResponse.json({ error: "No target language provided" }, { status: 400 });
    }

    const langCode = targetLanguage.toLowerCase().substring(0, 2);

    // If target is ES (Español), we might not need to translate if it's already ES, 
    // but the API handles auto-detection well.
    const [tTitle, tDesc, tComm, tHash] = await Promise.all([
      translateText(title, langCode),
      translateText(description, langCode),
      translateText(firstComment, langCode),
      translateText(hashtags, langCode)
    ]);

    return NextResponse.json({
      title: tTitle,
      description: tDesc,
      firstComment: tComm,
      hashtags: tHash
    });

  } catch (error: any) {
    console.error("Translate Error:", error);
    return NextResponse.json({ error: "Error de traducción: " + error.message }, { status: 500 });
  }
}
