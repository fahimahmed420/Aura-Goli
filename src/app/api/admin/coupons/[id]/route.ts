import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await req.json();
  const { code, type, value, minOrderAmount, usageLimit, expiresAt, isActive } = body;

  const data: Record<string, unknown> = {};
  if (code !== undefined) data.code = code.toUpperCase().trim();
  if (type !== undefined) data.type = type;
  if (value !== undefined) data.value = Number(value);
  if ("minOrderAmount" in body) data.minOrderAmount = minOrderAmount ? Number(minOrderAmount) : null;
  if ("usageLimit" in body) data.usageLimit = usageLimit ? Number(usageLimit) : null;
  if ("expiresAt" in body) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (isActive !== undefined) data.isActive = isActive;

  const coupon = await prisma.coupon.update({ where: { id }, data });
  return Response.json({ coupon });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  await prisma.coupon.delete({ where: { id } });
  return Response.json({ ok: true });
}
