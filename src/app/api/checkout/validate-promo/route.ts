import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { code, subtotal } = await req.json();
  if (!code) return apiError("Code is required", 400);

  const coupon = await prisma.coupon.findFirst({
    where: {
      code: code.toUpperCase(),
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!coupon) return apiError("Invalid or expired promo code", 400);
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return apiError("This promo code has reached its usage limit", 400);
  }
  if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
    return apiError(`Minimum order ৳${Number(coupon.minOrderAmount).toLocaleString()} required`, 400);
  }

  const discountAmount = coupon.type === "percent"
    ? Math.round((subtotal * Number(coupon.value)) / 100)
    : Math.min(Number(coupon.value), subtotal);

  return Response.json({
    code: coupon.code,
    type: coupon.type,
    value: Number(coupon.value),
    discountAmount,
  });
}
