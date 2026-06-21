import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ coupons });
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const body = await req.json();
  const { code, type, value, minOrderAmount, usageLimit, expiresAt, isActive } = body;

  if (!code || !type || value == null) {
    return Response.json({ error: "code, type and value are required" }, { status: 400 });
  }
  if (!["percent", "flat"].includes(type)) {
    return Response.json({ error: "type must be percent or flat" }, { status: 400 });
  }
  if (type === "percent" && (Number(value) < 1 || Number(value) > 100)) {
    return Response.json({ error: "Percent value must be 1–100" }, { status: 400 });
  }

  const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) return Response.json({ error: "Coupon code already exists" }, { status: 409 });

  const coupon = await prisma.coupon.create({
    data: {
      code: code.toUpperCase().trim(),
      type,
      value: Number(value),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== false,
    },
  });
  return Response.json({ coupon }, { status: 201 });
}
