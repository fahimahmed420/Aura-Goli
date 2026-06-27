import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, isValidEmail } from "@/lib/validation";
import { getCartIdentity } from "@/lib/cart";

export const dynamic = "force-dynamic";

// POST /api/cart/email — attach a guest's email to their cart so an abandoned
// cart can be recovered even before they create an account.
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return apiError("Invalid request body"); }

  const email = (body as { email?: unknown }).email;
  if (typeof email !== "string" || !isValidEmail(email)) return apiError("Valid email required");

  const identity = await getCartIdentity(req, true);
  const ownership = identity.userId
    ? { userId: identity.userId }
    : identity.sessionId
      ? { sessionId: identity.sessionId }
      : null;
  if (!ownership) return apiError("Could not establish a cart session", 400);

  const existing = await prisma.cart.findFirst({ where: ownership, select: { id: true } });
  if (existing) {
    await prisma.cart.update({ where: { id: existing.id }, data: { email: email.toLowerCase() } });
  } else {
    await prisma.cart.create({ data: { ...ownership, email: email.toLowerCase() } });
  }

  return Response.json({ ok: true });
}
