import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse(null, { status: 403 });
    }
  }

  return new NextResponse(null, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log('--- FB Webhook Event ---');
  console.log(JSON.stringify(body, null, 2));

  // Aquí se manejarán los eventos en el futuro (ej: clic en anuncio, cambio de presupuesto, etc)
  if (body.object === 'page') {
    // Manejar eventos de página
  }

  return NextResponse.json({ status: 'ok' });
}
