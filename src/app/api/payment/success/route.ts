import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSSLPayment } from "@/lib/sslcommerz";
import { sendOrderConfirmation } from "@/lib/email";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const valId = form.get("val_id") as string;
  const tranId = form.get("tran_id") as string;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!valId || !tranId) return Response.redirect(new URL("/cart?error=invalid_response", appUrl));

  const validation = await validateSSLPayment(valId).catch(() => null);
  if (!validation || (validation.status !== "VALID" && validation.status !== "VALIDATED")) {
    return Response.redirect(new URL("/cart?error=payment_invalid", appUrl));
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: tranId },
    include: {
      items: true,
      user: { select: { id: true, email: true, name: true, referredBy: true } },
    },
  });
  if (!order) return Response.redirect(new URL("/cart?error=order_not_found", appUrl));

  if (order.paymentStatus !== "paid") {
    /* Loyalty: 1 point per ৳10 spent */
    const loyaltyEarned = order.userId ? Math.floor(Number(order.total) / 10) : 0;

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: "confirmed", paymentStatus: "paid" },
      }),
      prisma.payment.upsert({
        where: { orderId: order.id },
        create: { orderId: order.id, gateway: "sslcommerz", gatewayTransactionId: valId, amount: order.total, status: "paid" },
        update: { gatewayTransactionId: valId, status: "paid" },
      }),
      prisma.orderStatusHistory.create({
        data: { orderId: order.id, status: "confirmed", note: `Payment confirmed via SSLCommerz. TxID: ${valId}` },
      }),
      ...(order.userId && loyaltyEarned > 0 ? [
        prisma.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: loyaltyEarned } } }),
        prisma.loyaltyTransaction.create({ data: { userId: order.userId, points: loyaltyEarned, type: "earn", description: `Earned from order ${order.orderNumber}`, orderId: order.id } }),
      ] : []),
    ]);

    const addr = order.shippingAddress as {
      name: string; phone: string; address: string; city: string; postalCode?: string; country?: string;
    };
    const customerEmail = order.user?.email ?? (addr as { email?: string }).email ?? "customer@example.com";
    const customerName  = order.user?.name ?? addr.name ?? "Customer";

    // Referral: if first paid order and user was referred, issue coupons
    if (order.userId && order.user?.referredBy) {
      try {
        const prevPaidCount = await prisma.order.count({
          where: { userId: order.userId, paymentStatus: "paid", id: { not: order.id } },
        });
        if (prevPaidCount === 0) {
          const rand = () => Math.random().toString(36).slice(2, 7).toUpperCase();
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await prisma.coupon.create({
            data: { code: `WELCOME10-${rand()}`, type: "percent", value: 10, usageLimit: 1, expiresAt },
          });
          const referrer = await prisma.user.findUnique({
            where: { referralCode: order.user.referredBy },
            select: { id: true },
          });
          if (referrer) {
            await prisma.coupon.create({
              data: { code: `THANKS-${rand()}`, type: "flat", value: 100, usageLimit: 1, expiresAt },
            });
          }
        }
      } catch (err) {
        console.error("Referral coupon error:", err);
      }
    }

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
  }

  return Response.redirect(new URL(`/order-confirmed?order=${tranId}`, appUrl));
}
