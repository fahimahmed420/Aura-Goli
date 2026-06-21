import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const orders = await prisma.order.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, orderNumber: true, status: true, paymentStatus: true,
      total: true, createdAt: true,
      items: {
        select: {
          productNameSnapshot: true, quantity: true,
          variant: { select: { product: { select: { images: { take: 1, select: { url: true }, orderBy: { sortOrder: "asc" } } } } } },
        },
        take: 3,
      },
    },
  });

  return Response.json({ orders });
}
