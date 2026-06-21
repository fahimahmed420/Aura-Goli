import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const { productId, variantId, size } = await req.json();
  if (!productId) return Response.json({ error: "productId required" }, { status: 400 });

  await prisma.backInStockSubscription.upsert({
    where: { userId_productId_variantId: { userId: auth.userId, productId, variantId: variantId ?? null } },
    create: { userId: auth.userId, productId, variantId: variantId ?? null, size },
    update: { size },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const { productId, variantId } = await req.json();
  await prisma.backInStockSubscription.deleteMany({
    where: { userId: auth.userId, productId, variantId: variantId ?? null },
  });
  return Response.json({ ok: true });
}
