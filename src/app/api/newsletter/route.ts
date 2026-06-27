import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, isValidEmail } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { sendNewsletterWelcome } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/newsletter — subscribe an email. Re-subscribing clears any prior
// opt-out so it stays consistent with the unsubscribe/suppression system.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(`newsletter:${ip}`, { limit: 5, windowSecs: 60 });
  if (!rl.allowed) return apiError("Too many requests. Please wait.", 429);

  let body: unknown;
  try { body = await req.json(); } catch { return apiError("Invalid request body"); }

  const email = (body as { email?: unknown }).email;
  if (typeof email !== "string" || !isValidEmail(email)) return apiError("Please enter a valid email.");

  const lower = email.toLowerCase();
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email: lower }, select: { unsubscribedAt: true },
  });
  // Welcome only a brand-new or re-subscribing address — not repeat submits.
  const shouldWelcome = !existing || existing.unsubscribedAt != null;

  await prisma.newsletterSubscriber.upsert({
    where: { email: lower },
    update: { unsubscribedAt: null },
    create: { email: lower },
  });

  if (shouldWelcome) {
    await sendNewsletterWelcome(lower).catch(() => { /* email failure must not fail signup */ });
  }

  return Response.json({ ok: true });
}
