import { prisma } from "@/lib/prisma";
import { sendOrderConfirmation } from "@/lib/email";
import { sendOrderStatusSms } from "@/lib/sms";
import { evaluateOrder } from "@/lib/courier";

// Marks an order paid and fires confirmation email/SMS/courier-dispatch —
// idempotent, so it's safe to call from both the gateway webhook and the
// customer-facing success redirect without double-processing.
export async function markOrderPaid(orderNumber: string, gateway: string, transactionId: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, user: { select: { id: true, email: true, name: true } } },
  });
  if (!order) return null;

  const alreadyPaid = await prisma.order.findUnique({
    where: { id: order.id },
    select: { paymentStatus: true },
  });
  if (alreadyPaid?.paymentStatus === "paid") return order;

  const loyaltyEarned = order.userId ? Math.floor(Number(order.total) / 10) : 0;

  await prisma.$transaction([
    prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: "paid" } },
      data: { status: "confirmed", paymentStatus: "paid" },
    }),
    prisma.payment.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, gateway, gatewayTransactionId: transactionId, amount: order.total, status: "paid" },
      update: { gatewayTransactionId: transactionId, status: "paid" },
    }),
    prisma.orderStatusHistory.create({
      data: { orderId: order.id, status: "confirmed", note: `Payment confirmed via ${gateway}. TxID: ${transactionId}` },
    }),
    ...(order.userId && loyaltyEarned > 0 ? [
      prisma.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: loyaltyEarned } } }),
      prisma.loyaltyTransaction.create({ data: { userId: order.userId, points: loyaltyEarned, type: "earn", description: `Earned from order ${order.orderNumber}`, orderId: order.id } }),
    ] : []),
  ]);

  const addr = order.shippingAddress as {
    name: string; phone: string; address: string; city: string; postalCode?: string; country?: string; email?: string;
  };
  const customerEmail = order.user?.email ?? order.guestEmail ?? addr.email ?? "customer@example.com";
  const customerName = order.user?.name ?? addr.name ?? "Customer";

  sendOrderConfirmation({
    orderNumber: order.orderNumber,
    customerName,
    customerEmail,
    items: order.items.map((item) => {
      const snap = item.variantSnapshot as { color?: string; size?: string; sku?: string } | null;
      return {
        name: item.productNameSnapshot,
        color: snap?.color ?? null,
        size: snap?.size ?? null,
        sku: snap?.sku ?? null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      };
    }),
    subtotal: Number(order.subtotal),
    shippingFee: Number(order.shippingFee),
    discount: Number(order.discount),
    total: Number(order.total),
    paymentMethod: order.paymentMethod,
    couponCode: order.couponCode ?? null,
    shippingAddress: {
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      postalCode: addr.postalCode ?? "",
      country: addr.country ?? "Bangladesh",
    },
    createdAt: order.createdAt,
  }).catch(console.error);

  if (addr?.phone) {
    sendOrderStatusSms(addr.phone, order.orderNumber, "confirmed", { total: Number(order.total) }).catch(console.error);
  }

  evaluateOrder(order.id).catch(console.error);

  return order;
}
