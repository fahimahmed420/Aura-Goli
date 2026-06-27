import { NextRequest } from "next/server";
import { apiError } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(`contact:${ip}`, { limit: 5, windowSecs: 60 });
  if (!rl.allowed) return apiError("Too many requests. Please wait.", 429);

  const { name, email, subject, message } = await req.json();
  if (!name || !email || !subject || !message) return apiError("All fields are required", 400);
  if (message.length > 2000) return apiError("Message too long", 400);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[CONTACT] From: ${name} <${email}> | Subject: ${subject}\n${message}`);
    return Response.json({ ok: true });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Aura Goli <onboarding@resend.dev>",
    to: "support@auragoli.com",
    replyTo: email,
    subject: `[Contact] ${subject} — ${name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9f9f9;">
        <div style="background:#12103a;padding:20px 28px;border-radius:10px 10px 0 0;">
          <span style="font-family:Georgia,serif;font-size:20px;color:#faf7f0;">Aura <span style="color:#c9a84c;">Goli</span> — Contact Message</span>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #e8e8e8;border-top:none;border-radius:0 0 10px 10px;">
          <table style="width:100%;font-size:14px;color:#444;">
            <tr><td style="padding:6px 0;font-weight:700;width:100px;">From</td><td>${name} &lt;${email}&gt;</td></tr>
            <tr><td style="padding:6px 0;font-weight:700;">Subject</td><td>${subject}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e8e8e8;margin:16px 0;" />
          <p style="font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
      </div>`,
  });

  return Response.json({ ok: true });
}
