import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";

const VALID_STATUSES = ["pending_payment", "confirmed", "packed", "shipped", "delivered", "cancelled", "refunded"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status)) return apiError("Invalid status", 400);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return apiError("Order not found", 404);

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({ where: { id }, data: { status } });
    await tx.orderStatusHistory.create({
      data: { orderId: id, status, note: `Status updated to ${status} by admin` },
    });
    /* Award loyalty points when COD order is confirmed for the first time */
    const wasUnconfirmed = order.status === "pending_payment" && status === "confirmed";
    if (wasUnconfirmed && order.userId && order.paymentMethod === "cod") {
      const pts = Math.floor(Number(order.total) / 10);
      if (pts > 0) {
        await tx.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: pts } } });
        await tx.loyaltyTransaction.create({ data: { userId: order.userId, points: pts, type: "earn", description: `Earned from order ${order.orderNumber}`, orderId: order.id } });
      }
    }
    return o;
  });

  return Response.json({ order: updated });
}
