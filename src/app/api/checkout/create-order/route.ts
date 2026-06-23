import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/validation";
import { initiateSSLPayment } from "@/lib/sslcommerz";
import { verifyAccessToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";
import { sendOrderConfirmation } from "@/lib/email";

const VALID_PAYMENT_METHODS = ["card", "bkash", "nagad", "rocket", "cod"] as const;
type PaymentMethod = typeof VALID_PAYMENT_METHODS[number];

function generateOrderNumber() {
  return "AG" + Date.now().toString().slice(-8) + randomBytes(2).toString("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  // Rate-limit by IP to prevent checkout abuse
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`checkout:${ip}`, { limit: 10, windowSecs: 60 });
  if (!rl.allowed) return apiError("Too many requests. Please wait.", 429);

  const body = await req.json();
  const { shippingAddress, items, promoCode, paymentMethod, guestEmail, isGift, flashSaleId } = body;
  const GIFT_FEE = 50;

  // Derive userId from Bearer token — never trust client-supplied user-id headers
  let userId: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(authHeader.slice(7));
      userId = payload.sub;
    } catch { /* guest checkout */ }
  }

  if (!shippingAddress?.name || !shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.phone) {
    return apiError("Shipping address incomplete", 400);
  }
  if (!items || items.length === 0) return apiError("Cart is empty", 400);
  if (items.length > 50) return apiError("Too many items in cart", 400);
  if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
    return apiError("Invalid payment method", 400);
  }

  // Validate stock & build order items from DB
  const variantIds = (items as { variantId: string }[]).map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { select: { id: true, name: true, price: true } } },
  });

  let subtotal = 0;
  const orderItems: { variant: typeof variants[number]; quantity: number; unitPrice: number }[] = [];

  for (const item of items as { variantId: string; quantity: number }[]) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      return apiError("Invalid item quantity", 400);
    }
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) return apiError(`Item not found`, 400);
    if (variant.stockQuantity < item.quantity) {
      return apiError(`${variant.product.name} has only ${variant.stockQuantity} left in stock`, 400);
    }
    const unitPrice = Number(variant.product.price) + Number(variant.priceModifier);
    subtotal += unitPrice * item.quantity;
    orderItems.push({ variant, quantity: item.quantity, unitPrice });
  }

  // Apply coupon
  let discountAmount = 0;
  let couponCode: string | null = null;
  if (promoCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: promoCode.toUpperCase(), isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    });
    if (coupon) {
      discountAmount = coupon.type === "percent"
        ? Math.round((subtotal * Number(coupon.value)) / 100)
        : Math.min(Number(coupon.value), subtotal);
      couponCode = coupon.code;
      await prisma.coupon.update({ where: { id: coupon.id }, data: { usageCount: { increment: 1 } } });
    }
  }

  // Apply flash sale discount server-side (verify against DB)
  let flashSaleDiscount = 0;
  if (flashSaleId) {
    const sale = await prisma.flashSale.findFirst({
      where: { id: flashSaleId, isActive: true, endsAt: { gt: new Date() } },
    }).catch(() => null);
    if (sale) {
      // Re-fetch variants with category to verify eligibility server-side
      const variantsWithCat = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: { include: { category: { select: { slug: true } } } } },
      });
      for (const item of orderItems) {
        const vWithCat = variantsWithCat.find(v => v.id === item.variant.id);
        const catSlug = vWithCat?.product.category?.slug ?? null;
        const matches = !sale.categorySlug || catSlug === sale.categorySlug;
        if (matches) flashSaleDiscount += Math.round(item.unitPrice * item.quantity * (sale.discountPercent / 100));
      }
    }
  }

  const shippingFee = subtotal >= 2000 ? 0 : 100;
  // Gift packaging is charged per item (per unit quantity), not per order.
  const totalQty = orderItems.reduce((s, oi) => s + oi.quantity, 0);
  const giftFee = isGift === true ? GIFT_FEE * totalQty : 0;
  const total = subtotal + shippingFee + giftFee - discountAmount - flashSaleDiscount;
  const orderNumber = generateOrderNumber();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Get customer email
  const customerEmail = userId
    ? ((await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email ?? guestEmail ?? "guest@example.com")
    : (guestEmail ?? "guest@example.com");

  // Create order
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        orderNumber,
        userId: userId ?? undefined,
        status: "pending_payment",
        paymentMethod: paymentMethod as PaymentMethod,
        paymentStatus: "pending",
        subtotal,
        shippingFee,
        discount: discountAmount + flashSaleDiscount,
        total,
        isGift: isGift === true,
        giftFee,
        couponCode: couponCode ?? undefined,
        shippingAddress: {
          name: shippingAddress.name,
          phone: shippingAddress.phone,
          address: shippingAddress.address,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode ?? "",
          country: "Bangladesh",
        },
        items: {
          create: orderItems.map(({ variant, quantity, unitPrice }) => ({
            variantId: variant.id,
            productNameSnapshot: variant.product.name,
            variantSnapshot: { color: variant.color, size: variant.size, sku: variant.sku },
            quantity,
            unitPrice,
          })),
        },
      },
    });

    // Decrement stock
    for (const { variant, quantity } of orderItems) {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stockQuantity: { decrement: quantity } },
      });
    }

    // salesCount increment
    const productIds = [...new Set(orderItems.map((oi) => oi.variant.product.id))];
    for (const pid of productIds) {
      await tx.product.update({ where: { id: pid }, data: { salesCount: { increment: 1 } } });
    }

    await tx.orderStatusHistory.create({
      data: { orderId: o.id, status: "pending_payment", note: "Order created" },
    });

    return o;
  });

  // COD — skip payment gateway
  if (paymentMethod === "cod") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "confirmed" } });
    await prisma.orderStatusHistory.create({ data: { orderId: order.id, status: "confirmed", note: "Cash on delivery order confirmed" } });
    sendOrderConfirmation({
      orderNumber,
      customerName: shippingAddress.name,
      customerEmail,
      items: orderItems.map(({ variant, quantity, unitPrice }) => ({
        name: variant.product.name,
        color: variant.color,
        size: variant.size,
        sku: variant.sku,
        quantity,
        unitPrice,
      })),
      subtotal,
      shippingFee,
      giftFee,
      discount: discountAmount,
      total,
      paymentMethod,
      couponCode,
      isGift: isGift === true,
      shippingAddress: {
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        address: shippingAddress.address,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode ?? "",
        country: "Bangladesh",
      },
      createdAt: new Date(),
    }).catch(console.error);
    return Response.json({ orderId: order.id, orderNumber, redirectUrl: `/order-confirmed?order=${orderNumber}` });
  }

  // SSLCommerz for all digital payments
  try {
    const ssl = await initiateSSLPayment({
      orderNumber,
      total,
      customerName: shippingAddress.name,
      customerEmail,
      customerPhone: shippingAddress.phone,
      shippingAddress: shippingAddress.address,
      shippingCity: shippingAddress.city,
      productName: orderItems[0].variant.product.name + (orderItems.length > 1 ? ` +${orderItems.length - 1} more` : ""),
      successUrl: `${appUrl}/api/payment/success`,
      failUrl: `${appUrl}/api/payment/fail`,
      cancelUrl: `${appUrl}/cart`,
      ipnUrl: `${appUrl}/api/payment/ipn`,
    });

    if (ssl.status === "SUCCESS" && ssl.GatewayPageURL) {
      // Store session key
      await prisma.payment.create({
        data: { orderId: order.id, gateway: "sslcommerz", amount: total, status: "pending", rawWebhookPayload: { sessionkey: ssl.sessionkey } },
      });
      return Response.json({ orderId: order.id, orderNumber, redirectUrl: ssl.GatewayPageURL });
    }

    await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled", paymentStatus: "failed" } });
    return apiError(ssl.failedreason ?? "Payment gateway unavailable", 502);
  } catch {
    await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled", paymentStatus: "failed" } });
    return apiError("Payment gateway error", 502);
  }
}
