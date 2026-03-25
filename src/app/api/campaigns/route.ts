import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { ads: true } },
      ads: { select: { id: true, title: true } }
    }
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, hashtags, firstComment } = body;
  
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const campaign = await prisma.campaign.create({
    data: {
      name,
      userId: session.user.id,
      hashtags,
      firstComment,
    },
  });
  return NextResponse.json(campaign);
}
