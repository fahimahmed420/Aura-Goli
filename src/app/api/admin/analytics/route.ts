import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [currentOrders, previousOrders, totalCustomers, categoryStats] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: "cancelled" } },
      select: { total: true, createdAt: true, userId: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, status: { not: "cancelled" } },
      select: { total: true },
    }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.orderItem.groupBy({
      by: ["productNameSnapshot"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 4,
    }),
  ]);

  const currentRevenue = currentOrders.reduce((s, o) => s + Number(o.total), 0);
  const previousRevenue = previousOrders.reduce((s, o) => s + Number(o.total), 0);
  const revenueDelta = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const ordersDelta = previousOrders.length > 0 ? ((currentOrders.length - previousOrders.length) / previousOrders.length) * 100 : 0;
  const avgOrder = currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0;
  const prevAvgOrder = previousOrders.length > 0 ? previousRevenue / previousOrders.length : 0;
  const avgDelta = prevAvgOrder > 0 ? ((avgOrder - prevAvgOrder) / prevAvgOrder) * 100 : 0;

  // Build last 6 months chart data
  const months: { month: string; curr: number; prev: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-GB", { month: "short" });
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const prevStart = new Date(d.getFullYear() - 1, d.getMonth(), 1);
    const prevEnd = new Date(d.getFullYear() - 1, d.getMonth() + 1, 0);

    const [curr, prev] = await Promise.all([
      prisma.order.aggregate({ where: { createdAt: { gte: start, lte: end }, status: { not: "cancelled" } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: prevStart, lte: prevEnd }, status: { not: "cancelled" } }, _sum: { total: true } }),
    ]);
    months.push({ month: label, curr: Number(curr._sum.total ?? 0), prev: Number(prev._sum.total ?? 0) });
  }

  return Response.json({
    summary: {
      totalSales: Math.round(currentRevenue),
      netOrders: currentOrders.length,
      avgOrderValue: Math.round(avgOrder),
      revenueDelta: Math.round(revenueDelta * 10) / 10,
      ordersDelta: Math.round(ordersDelta * 10) / 10,
      avgDelta: Math.round(avgDelta * 10) / 10,
    },
    chartData: months,
    totalCustomers,
  });
}
