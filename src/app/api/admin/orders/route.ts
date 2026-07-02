import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const pageSize = Math.min(50, parseInt(sp.get("pageSize") ?? "20"));
  const status = sp.get("status") ?? undefined;
  const q = sp.get("q") ?? undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, orderNumber: true, status: true, paymentStatus: true,
          total: true, createdAt: true, paymentMethod: true, shippingAddress: true, isGift: true, giftFee: true,
          courierName: true, trackingNumber: true, guestEmail: true,
          courierDispatch: {
            select: { riskVerdict: true, riskDetails: true, autoDispatch: true, courier: true, consignmentId: true, trackingCode: true, courierStatus: true, lastError: true },
          },
          user: { select: { name: true, email: true } },
          items: { select: { productNameSnapshot: true, variantSnapshot: true, quantity: true, unitPrice: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return Response.json({ orders, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    console.error("[admin/orders]", err);
    return Response.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
