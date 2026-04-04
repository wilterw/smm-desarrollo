import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/social/accounts — List connected social accounts for the user
 * DELETE /api/social/accounts — Disconnect a social account
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        accountName: true,
        pageId: true, // Necessary to distinguish between Feed and Fanpages in wizard
        pageName: true,
        adAccountId: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { accountId, providerAccountId, provider } = await req.json();
    
    if (providerAccountId && provider) {
      // Bulk disconnect by Titular
      await prisma.socialAccount.deleteMany({
        where: {
          userId: session.user.id,
          providerAccountId,
          provider
        }
      });
      return NextResponse.json({ message: "All accounts for this titular disconnected" });
    }

    if (accountId) {
      const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
      if (!account || account.userId !== session.user.id) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      await prisma.socialAccount.delete({ where: { id: accountId } });
      return NextResponse.json({ message: "Account disconnected" });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error) {
    console.error("DELETE /api/social/accounts error:", error);
    return NextResponse.json({ error: "Failed to disconnect account" }, { status: 500 });
  }
}
