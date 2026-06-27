import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/validation";
import { getCartIdentity, cartWhere, cartInclude, serializeCart } from "@/lib/cart";

export const dynamic = "force-dynamic";

// GET /api/cart — return the persisted cart for the current user or guest.
export async function GET(req: NextRequest) {
  const identity = await getCartIdentity(req, false);
  const where = cartWhere(identity);
  if (!where) return Response.json({ items: [] });

  const cart = await prisma.cart.findFirst({ where, include: cartInclude });
  return Response.json({ items: serializeCart(cart) });
}

// PUT /api/cart — mirror the client's cart. Body: { items: [{ variantId, quantity }] }.
export async function PUT(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return apiError("Invalid request body"); }

  const rawItems = (body as { items?: unknown }).items;
  if (!Array.isArray(rawItems)) return apiError("items must be an array");

  // Sanitise: keep real variant ids, clamp quantity, dedupe (last wins).
  const byVariant = new Map<string, number>();
  for (const it of rawItems as { variantId?: unknown; quantity?: unknown }[]) {
    if (typeof it?.variantId !== "string") continue;
    const qty = Math.max(1, Math.min(20, Math.floor(Number(it.quantity) || 1)));
    byVariant.set(it.variantId, qty);
  }

  // Only persist variant ids that actually exist (drops synthetic "*-default" ids).
  const ids = [...byVariant.keys()];
  const valid = ids.length
    ? await prisma.productVariant.findMany({ where: { id: { in: ids } }, select: { id: true } })
    : [];
  const validIds = new Set(valid.map((v) => v.id));
  const items = [...byVariant.entries()]
    .filter(([variantId]) => validIds.has(variantId))
    .map(([variantId, quantity]) => ({ variantId, quantity }));

  // Resolve identity, minting a guest session cookie if needed (allowCreate).
  const identity = await getCartIdentity(req, true);
  const ownership = identity.userId
    ? { userId: identity.userId }
    : identity.sessionId
      ? { sessionId: identity.sessionId }
      : null;
  if (!ownership) return apiError("Could not establish a cart session", 400);

  const norm = (arr: { variantId: string; quantity: number }[]) =>
    arr.map((i) => `${i.variantId}:${i.quantity}`).sort().join("|");

  // Reads happen outside the transaction so the write tx stays tiny and never
  // hits the 5s interactive-transaction cap on a cold database.
  const existing = await prisma.cart.findFirst({ where: ownership, select: { id: true } });
  const cartId = existing?.id ?? (await prisma.cart.create({ data: ownership, select: { id: true } })).id;
  const current = await prisma.cartItem.findMany({
    where: { cartId }, select: { variantId: true, quantity: true },
  });

  // Only mutate when the item set actually changed — a no-op mirror (CartSync
  // pushes on every load) must NOT bump updatedAt, or the cart would never age
  // into "abandoned". A real change re-arms the reminder.
  const changed = norm(current) !== norm(items);
  if (changed) {
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cartId } }),
      ...(items.length
        ? [prisma.cartItem.createMany({ data: items.map((i) => ({ cartId, variantId: i.variantId, quantity: i.quantity })) })]
        : []),
      prisma.cart.update({ where: { id: cartId }, data: { reminderSentAt: null } }),
    ]);
  }

  return Response.json({ ok: true, count: items.length, changed });
}
