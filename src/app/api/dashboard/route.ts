import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = session.user.id;

    // Parallel queries for performance
    const [
      totalCampaigns,
      totalAds,
      totalPublications,
      totalSocialAccounts,
      campaignsByStatus,
      publicationsByStatus,
      publicationsByPlatform,
      recentAds,
      recentPublications,
      budgetSum,
    ] = await Promise.all([
      // Counts
      prisma.campaign.count({ where: { userId } }),
      prisma.ad.count({ where: { campaign: { userId } } }),
      prisma.publication.count({ where: { ad: { campaign: { userId } } } }),
      prisma.socialAccount.count({ where: { userId } }),

      // Campaigns by status
      prisma.campaign.groupBy({
        by: ["status"],
        where: { userId },
        _count: { status: true },
      }),

      // Publications by status
      prisma.publication.groupBy({
        by: ["status"],
        where: { ad: { campaign: { userId } } },
        _count: { status: true },
      }),

      // Publications by platform
      prisma.publication.groupBy({
        by: ["platform"],
        where: { ad: { campaign: { userId } } },
        _count: { platform: true },
      }),

      // Recent ads (last 5)
      prisma.ad.findMany({
        where: { campaign: { userId } },
        include: { campaign: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Recent publications (last 5)
      prisma.publication.findMany({
        where: { ad: { campaign: { userId } } },
        include: {
          ad: {
            select: {
              title: true,
              campaign: { select: { name: true } },
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),

      // Total budget
      prisma.adBudget.aggregate({
        where: { publication: { ad: { campaign: { userId } } } },
        _sum: { totalBudget: true, dailyBudget: true },
      }),
    ]);

    // Format campaign statuses
    const campaignStatuses: Record<string, number> = {};
    campaignsByStatus.forEach((s) => {
      campaignStatuses[s.status] = s._count.status;
    });

    // Format publication statuses
    const publicationStatuses: Record<string, number> = {};
    publicationsByStatus.forEach((s) => {
      publicationStatuses[s.status] = s._count.status;
    });

    // Format platform distribution
    const platformDistribution: Record<string, number> = {};
    publicationsByPlatform.forEach((p) => {
      platformDistribution[p.platform] = p._count.platform;
    });

    return NextResponse.json({
      counts: {
        campaigns: totalCampaigns,
        ads: totalAds,
        publications: totalPublications,
        socialAccounts: totalSocialAccounts,
      },
      campaignStatuses,
      publicationStatuses,
      platformDistribution,
      recentAds,
      recentPublications,
      budget: {
        totalBudget: budgetSum._sum.totalBudget || 0,
        dailyBudget: budgetSum._sum.dailyBudget || 0,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
