import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/validation";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true, status: true, paymentStatus: true,
      total: true, shippingFee: true, discount: true, subtotal: true,
      createdAt: true, trackingNumber: true, courierName: true,
      shippingAddress: true,
      items: { select: { productNameSnapshot: true, quantity: true, unitPrice: true } },
      statusHistory: { select: { status: true, note: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return apiError("Order not found", 404);

  return Response.json({ order });
}
