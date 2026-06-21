import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { apiError, sanitizeText } from "@/lib/validation";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const existing = await prisma.address.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return apiError("Address not found", 404);

  const body = await req.json();
  const { fullName, phone, line1, line2, district, thana, city, postalCode, isDefault } = body;

  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: auth.userId }, data: { isDefault: false } });
  }

  const address = await prisma.address.update({
    where: { id },
    data: {
      fullName: fullName ? sanitizeText(fullName, 120) : existing.fullName,
      phone: phone?.trim().slice(0, 30) ?? existing.phone,
      line1: line1 ? sanitizeText(line1, 200) : existing.line1,
      line2: line2?.trim() || null,
      district: district ? sanitizeText(district, 100) : existing.district,
      thana: thana ? sanitizeText(thana, 100) : existing.thana,
      city: city ? sanitizeText(city, 100) : existing.city,
      postalCode: postalCode?.trim() ?? existing.postalCode,
      isDefault: isDefault ?? existing.isDefault,
    },
  });

  return Response.json({ address });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const existing = await prisma.address.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return apiError("Address not found", 404);

  await prisma.address.delete({ where: { id } });

  if (existing.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId: auth.userId }, orderBy: { id: "asc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }

  return Response.json({ ok: true });
}
