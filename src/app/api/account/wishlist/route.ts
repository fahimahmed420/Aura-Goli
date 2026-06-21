import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const items = await prisma.wishlistItem.findMany({
    where: { userId: auth.userId },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, price: true,
          images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
          variants: { select: { color: true, size: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const { productId } = await req.json();
  if (!productId) return apiError("productId required", 400);

  const existing = await prisma.wishlistItem.findFirst({
    where: { userId: auth.userId, productId },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return Response.json({ wishlisted: false });
  }

  await prisma.wishlistItem.create({ data: { userId: auth.userId, productId } });
  return Response.json({ wishlisted: true });
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const { productId } = await req.json();
  if (!productId) return apiError("productId required", 400);

  await prisma.wishlistItem.deleteMany({
    where: { userId: auth.userId, productId },
  });

  return Response.json({ ok: true });
}
