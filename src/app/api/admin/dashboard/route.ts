import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const todayStart = startOfDay(new Date());
  const yesterdayStart = startOfDay(daysAgo(1));
  const thirtyDaysAgo = daysAgo(30);
  const sixtyDaysAgo = daysAgo(60);

  const [
    todayRevenue, yesterdayRevenue,
    totalOrders, prevPeriodOrders,
    newCustomers, prevCustomers,
    pendingOrders,
    recentOrders,
    lowStockVariants,
    topProducts,
    revenueByDay,
  ] = await Promise.all([
    // Today's revenue
    prisma.order.aggregate({
      where: { createdAt: { gte: todayStart }, paymentStatus: "paid" },
      _sum: { total: true },
    }),
    // Yesterday's revenue
    prisma.order.aggregate({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart }, paymentStatus: "paid" },
      _sum: { total: true },
    }),
    // Total orders last 30d
    prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    // Orders previous 30d
    prisma.order.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    // New customers last 30d
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo }, role: "customer" } }),
    // New customers previous 30d
    prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, role: "customer" } }),
    // Pending orders
    prisma.order.count({ where: { status: "pending_payment" } }),
    // Recent orders
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, orderNumber: true, status: true, total: true, createdAt: true, paymentMethod: true,
        user: { select: { name: true, email: true } },
        items: { select: { productNameSnapshot: true }, take: 1 },
      },
    }),
    // Low stock variants (≤5)
    prisma.productVariant.findMany({
      where: { stockQuantity: { lte: 5 } },
      select: {
        id: true, color: true, size: true, sku: true, stockQuantity: true,
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { stockQuantity: "asc" },
      take: 10,
    }),
    // Top products by sales
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { salesCount: "desc" },
      take: 5,
      select: {
        id: true, name: true, slug: true, salesCount: true, price: true,
        images: { select: { url: true }, take: 1 },
      },
    }),
    // Revenue per day for last 30 days (raw aggregation using order table)
    prisma.order.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: thirtyDaysAgo }, paymentStatus: "paid" },
      _sum: { total: true },
    }),
  ]);

  // Build daily revenue chart data
  const revenueMap = new Map<string, number>();
  for (const row of revenueByDay) {
    const key = row.createdAt.toISOString().slice(0, 10);
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + Number(row._sum.total ?? 0));
  }
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, revenue: revenueMap.get(key) ?? 0 };
  });

  function pctDelta(current: number, prev: number) {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  }

  const todayRev = Number(todayRevenue._sum.total ?? 0);
  const yestRev = Number(yesterdayRevenue._sum.total ?? 0);

  return Response.json({
    kpis: {
      todayRevenue: todayRev,
      todayRevenueDelta: pctDelta(todayRev, yestRev),
      totalOrders,
      ordersDelta: pctDelta(totalOrders, prevPeriodOrders),
      newCustomers,
      customersDelta: pctDelta(newCustomers, prevCustomers),
      pendingOrders,
    },
    recentOrders,
    lowStockVariants,
    topProducts,
    chartData,
  });
}
