import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";
import { sendReviewRequest, sendOrderStatusUpdate } from "@/lib/email";
import { sendOrderStatusSms } from "@/lib/sms";

const VALID_STATUSES = ["pending_payment", "confirmed", "packed", "shipped", "delivered", "cancelled", "refunded"];

// Statuses the customer is notified about when the admin sets them.
const NOTIFY_STATUSES = new Set(["confirmed", "packed", "shipped", "delivered", "cancelled", "refunded"]);

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await req.json();
  const { status } = body;
  const courierName = typeof body.courierName === "string" ? body.courierName.trim().slice(0, 100) : undefined;
  const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim().slice(0, 100) : undefined;

  if (!status || !VALID_STATUSES.includes(status)) return apiError("Invalid status", 400);

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return apiError("Order not found", 404);

  // Shipped orders must carry courier info — it's what the customer tracking page shows.
  const effectiveCourier = courierName ?? order.courierName;
  const effectiveTracking = trackingNumber ?? order.trackingNumber;
  if (status === "shipped" && (!effectiveCourier || !effectiveTracking)) {
    return apiError("Courier name and tracking number are required to mark an order as shipped", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id },
      data: {
        status,
        ...(courierName !== undefined && { courierName }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        // COD is collected at the doorstep — delivery is when it becomes revenue.
        ...(status === "delivered" && order.paymentMethod === "cod" && order.paymentStatus !== "paid" && { paymentStatus: "paid" }),
      },
    });
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
    /* Return stock to inventory the first time an order is cancelled/refunded */
    const wasActive = !["cancelled", "refunded"].includes(order.status);
    if (wasActive && ["cancelled", "refunded"].includes(status)) {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }
    }
    return o;
  });

  // Notify the customer about the transition (never block the update on notification failure).
  if (status !== order.status && NOTIFY_STATUSES.has(status)) {
    try {
      const contact = await prisma.order.findUnique({
        where: { id },
        select: { guestEmail: true, shippingAddress: true, user: { select: { email: true } } },
      });
      const addr = contact?.shippingAddress as { email?: string; phone?: string } | null;
      const email = contact?.user?.email ?? contact?.guestEmail ?? addr?.email;
      if (email) sendOrderStatusUpdate(email, order.orderNumber, status).catch(console.error);
      if (addr?.phone) {
        sendOrderStatusSms(addr.phone, order.orderNumber, status, {
          courier: effectiveCourier,
          trackingCode: effectiveTracking,
        }).catch(console.error);
      }
    } catch { /* non-critical */ }
  }

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
