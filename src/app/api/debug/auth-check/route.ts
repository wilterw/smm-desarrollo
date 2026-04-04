import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" });

  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        accountName: true,
        pageName: true,
        adAccountId: true,
        pageId: true,
      }
    });

    return NextResponse.json({
      user: session.user.email,
      accountsFound: accounts.length,
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.pageName || a.accountName,
        hasAdAccountId: !!a.adAccountId,
        adAccountId: a.adAccountId || "NULL"
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
