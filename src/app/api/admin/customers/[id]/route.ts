import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, isBlocked: true,
      createdAt: true, emailVerifiedAt: true, loyaltyPoints: true, avatarUrl: true,
      addresses: {
        select: { id: true, fullName: true, line1: true, city: true, district: true, phone: true, isDefault: true },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, orderNumber: true, status: true, paymentStatus: true,
          total: true, paymentMethod: true, createdAt: true,
          items: { select: { productNameSnapshot: true, quantity: true } },
        },
      },
      _count: { select: { orders: true, reviews: true, wishlistItems: true } },
    },
  });

  if (!user) return apiError("Customer not found", 404);
  return Response.json({ user });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await req.json();

  if (typeof body.isBlocked !== "boolean") return apiError("isBlocked must be boolean", 400);

  const user = await prisma.user.update({
    where: { id },
    data: { isBlocked: body.isBlocked },
    select: { id: true, name: true, email: true, isBlocked: true },
  });

  return Response.json({ user });
}
