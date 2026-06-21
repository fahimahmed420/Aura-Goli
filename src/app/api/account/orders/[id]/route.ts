import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, userId: auth.userId },
    select: {
      id: true, orderNumber: true, status: true, paymentStatus: true, paymentMethod: true,
      subtotal: true, discount: true, shippingFee: true, total: true, couponCode: true,
      courierName: true, trackingNumber: true, notes: true, shippingAddress: true,
      isGift: true, giftFee: true, createdAt: true, updatedAt: true,
      items: {
        select: {
          id: true, productNameSnapshot: true, quantity: true, unitPrice: true,
          variantSnapshot: true,
          variant: {
            select: {
              color: true, size: true,
              product: { select: { slug: true, images: { take: 1, select: { url: true }, orderBy: { sortOrder: "asc" } } } },
            },
          },
        },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: { status: true, note: true, createdAt: true },
      },
    },
  });

  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  return Response.json({ order });
}
