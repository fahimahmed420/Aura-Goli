import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/email";

export const dynamic = "force-dynamic";

// Records the opt-out for both guests (newsletter row) and account holders
// (notification preference). One unsubscribe stops all marketing email.
async function suppress(email: string) {
  const lower = email.toLowerCase();
  await prisma.newsletterSubscriber.upsert({
    where: { email: lower },
    update: { unsubscribedAt: new Date() },
    create: { email: lower, unsubscribedAt: new Date() },
  });
  const user = await prisma.user.findUnique({ where: { email: lower }, select: { id: true } });
  if (user) {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: { emailOn: false },
      create: { userId: user.id, emailOn: false },
    });
  }
}

function page(title: string, message: string, status = 200) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
      <meta name="robots" content="noindex"/><title>${title} — Aura Goli</title></head>
      <body style="margin:0;font-family:Arial,sans-serif;background:#0b0b14;color:#faf7f0;display:flex;align-items:center;justify-content:center;min-height:100vh;">
        <div style="max-width:420px;text-align:center;padding:40px 24px;">
          <p style="font-family:Georgia,serif;font-size:26px;font-weight:700;margin:0 0 20px;">Aura <span style="color:#c9a84c;">Goli</span></p>
          <h1 style="font-size:20px;font-weight:600;margin:0 0 12px;">${title}</h1>
          <p style="font-size:14px;line-height:1.6;color:rgba(250,247,240,0.6);margin:0 0 24px;">${message}</p>
          <a href="/" style="display:inline-block;background:#c9a84c;color:#0b0b14;text-decoration:none;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:12px 28px;border-radius:100px;">Back to store</a>
        </div>
      </body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

// One-click unsubscribe (RFC 8058) — Gmail/Yahoo POST to the List-Unsubscribe URL.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return new Response("Invalid unsubscribe link", { status: 400 });
  }
  await suppress(email);
  return new Response("Unsubscribed", { status: 200 });
}

// User clicks the link in the email.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return page("Invalid link", "This unsubscribe link is invalid or has expired.", 400);
  }
  await suppress(email);
  return page(
    "You're unsubscribed",
    "You'll no longer receive marketing emails from Aura Goli. Order and account emails will still be sent.",
  );
}
