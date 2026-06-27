import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/validation";
import { sendAbandonedCartEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Remind on carts idle at least this long that haven't been reminded since their
// last change. Dedup is per-cart (reminderSentAt), so the cron can run at any
// cadence — hourly on Vercel Pro, daily on Hobby — and each cart is emailed once.
const MIN_IDLE_HOURS = Number(process.env.ABANDONED_CART_IDLE_HOURS ?? 2);

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return apiError("Cron not configured", 503);

  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(req.url).searchParams.get("secret");
  if (provided !== secret) return apiError("Forbidden", 403);

  const cutoff = new Date(Date.now() - MIN_IDLE_HOURS * 60 * 60 * 1000);
  const carts = await prisma.cart.findMany({
    where: {
      reminderSentAt: null,
      updatedAt: { lte: cutoff },
      items: { some: {} },
      // Recoverable = signed-in user (we have their email) OR a guest who left one.
      OR: [{ userId: { not: null } }, { email: { not: null } }],
    },
    select: {
      id: true,
      email: true,
      user: { select: { email: true, name: true } },
      items: { select: { quantity: true, variant: { select: { product: { select: { name: true } } } } } },
    },
    take: 200, // cap a single run
  });

  let sent = 0;
  for (const cart of carts) {
    const email = cart.user?.email ?? cart.email;
    if (!email || cart.items.length === 0) continue;
    const items = cart.items.map((it) => ({ name: it.variant.product.name, quantity: it.quantity }));
    try {
      await sendAbandonedCartEmail(email, cart.user?.name ?? "there", items);
      // Stamp only after a successful send so failures retry next run.
      await prisma.cart.update({ where: { id: cart.id }, data: { reminderSentAt: new Date() } });
      sent++;
    } catch { /* skip a failed send, continue the batch */ }
  }

  return Response.json({ ok: true, eligible: carts.length, sent });
}

// Accept both POST (typical cron) and GET (easy manual/Vercel-cron trigger).
export const POST = run;
export const GET = run;
