import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { resolveTokenPayload } from "@/lib/require-auth";

const CART_COOKIE = "cart_session";
const isProd = process.env.NODE_ENV === "production";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

// Joins each cart item back to its variant + product so the client can rehydrate
// the same shape it keeps in localStorage.
export const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, price: true,
              category: { select: { slug: true } },
              images: { select: { url: true }, orderBy: { sortOrder: "asc" as const }, take: 1 },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export interface ClientCartItem {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  color: string | null;
  size: string | null;
  image: string | null;
  quantity: number;
  sku: string;
  categorySlug: string | null;
}

export function serializeCart(cart: CartWithItems | null): ClientCartItem[] {
  if (!cart) return [];
  return cart.items.map((it) => ({
    variantId: it.variantId,
    productId: it.variant.product.id,
    name: it.variant.product.name,
    price: Number(it.variant.product.price) + Number(it.variant.priceModifier),
    color: it.variant.color,
    size: it.variant.size,
    image: it.variant.product.images[0]?.url ?? null,
    quantity: it.quantity,
    sku: it.variant.sku,
    categorySlug: it.variant.product.category?.slug ?? null,
  }));
}

export interface CartIdentity {
  userId: string | null;
  sessionId: string | null;
}

/**
 * Resolves who the cart belongs to: a signed-in user (from the auth cookie/header)
 * or an anonymous guest (from the cart_session cookie). When `allowCreate` is set
 * and neither exists, a fresh guest session cookie is minted.
 */
export async function getCartIdentity(req: NextRequest, allowCreate = false): Promise<CartIdentity> {
  const payload = resolveTokenPayload(req);
  const userId = payload?.sub ?? null;

  const store = await cookies();
  let sessionId = store.get(CART_COOKIE)?.value ?? null;

  if (!userId && !sessionId && allowCreate) {
    sessionId = randomBytes(24).toString("hex");
    store.set(CART_COOKIE, sessionId, {
      httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: CART_COOKIE_MAX_AGE,
    });
  }

  return { userId, sessionId };
}

/** Where-clause to find a cart for the given identity (user takes precedence). */
export function cartWhere(identity: CartIdentity): Prisma.CartWhereInput | null {
  if (identity.userId) return { userId: identity.userId };
  if (identity.sessionId) return { sessionId: identity.sessionId };
  return null;
}
