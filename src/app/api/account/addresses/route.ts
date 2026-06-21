import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { apiError, sanitizeText } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const addresses = await prisma.address.findMany({
    where: { userId: auth.userId },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });

  return Response.json({ addresses });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const body = await req.json();
  const { fullName, phone, line1, line2, district, thana, city, postalCode, label, isDefault } = body;

  if (!fullName?.trim() || !line1?.trim() || !city?.trim())
    return apiError("Full name, address line, and city are required", 400);

  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: auth.userId }, data: { isDefault: false } });
  }

  const hasExisting = await prisma.address.count({ where: { userId: auth.userId } });

  const address = await prisma.address.create({
    data: {
      userId: auth.userId,
      fullName: sanitizeText(fullName, 120),
      phone: phone?.trim().slice(0, 30) || "",
      line1: sanitizeText(line1, 200),
      line2: line2?.trim().slice(0, 200) || null,
      district: sanitizeText(district ?? city, 100),
      thana: sanitizeText(thana ?? "", 100),
      city: sanitizeText(city, 100),
      postalCode: postalCode?.trim().slice(0, 20) || "",
      isDefault: isDefault || hasExisting === 0,
    },
  });

  return Response.json({ address }, { status: 201 });
}
