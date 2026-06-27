import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";
import { sendReviewRequest } from "@/lib/email";

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

  // On first transition to "delivered", ask the customer to review their purchase.
  if (status === "delivered" && order.status !== "delivered") {
    try {
      const full = await prisma.order.findUnique({
        where: { id },
        select: {
          guestEmail: true, shippingAddress: true,
          user: { select: { email: true, name: true } },
          items: { select: { variant: { select: { product: { select: { slug: true, name: true } } } } } },
        },
      });
      const addr = full?.shippingAddress as { name?: string; email?: string } | null;
      const email = full?.user?.email ?? full?.guestEmail ?? addr?.email;
      const name = full?.user?.name ?? addr?.name ?? "there";
      const product = full?.items.find((it) => it.variant?.product?.slug)?.variant?.product;
      if (email && product) {
        await sendReviewRequest(email, name, product.name, product.slug);
      }
    } catch { /* email failure must not block the status update */ }
  }

  return Response.json({ order: updated });
}
