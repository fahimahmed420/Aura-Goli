/**
 * BulkSMSBD SMS notifications.
 * Docs: https://bulksmsbd.net/developer-api-documentation
 *
 * Env:
 *   BULKSMSBD_API_KEY   — from bulksmsbd.net dashboard
 *   BULKSMSBD_SENDER_ID — approved sender id (masked name or number)
 *   SMS_ENABLED         — set "false" to hard-disable sending (default: on when key present)
 *
 * Messages are deliberately short English one-liners: one ASCII SMS segment is
 * 160 chars, but a Bangla (unicode) segment is only 70 — English keeps every
 * notification at 1 segment ≈ Tk0.20-0.35 each.
 */

import { normalizeBdPhone, isValidBdPhone } from "@/lib/courier/risk";

const API_URL = process.env.BULKSMSBD_API_URL ?? "https://bulksmsbd.net/api/smsapi";
const BRAND = "Aura Goli";

function smsEnabled(): boolean {
  if (process.env.SMS_ENABLED === "false") return false;
  return !!process.env.BULKSMSBD_API_KEY;
}

/** Send a single SMS. Never throws — notification failure must not break order flows. */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  const local = normalizeBdPhone(phone);
  if (!isValidBdPhone(local)) {
    console.log(`[SMS] invalid BD number, skipping: ${phone}`);
    return false;
  }
  if (!smsEnabled()) {
    console.log(`[SMS] disabled or no BULKSMSBD_API_KEY — skipping. To: ${local} | ${message}`);
    return false;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        api_key: process.env.BULKSMSBD_API_KEY!,
        type: "text",
        number: `88${local}`, // BulkSMSBD expects 8801XXXXXXXXX
        senderid: process.env.BULKSMSBD_SENDER_ID ?? "",
        message,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => null);
    // BulkSMSBD returns response_code 202 on success.
    const ok = data?.response_code === 202;
    if (!ok) console.error(`[SMS] send failed (${data?.response_code}): ${data?.error_message ?? "unknown error"}`);
    return ok;
  } catch (err) {
    console.error("[SMS] request error:", (err as Error).message);
    return false;
  }
}

interface StatusSmsExtra {
  total?: number;
  courier?: string | null;
  trackingCode?: string | null;
}

/** Order-lifecycle SMS. Statuses without a template are silently skipped. */
export async function sendOrderStatusSms(
  phone: string,
  orderNumber: string,
  status: string,
  extra: StatusSmsExtra = {},
): Promise<boolean> {
  const templates: Record<string, string> = {
    confirmed: `${BRAND}: Order #${orderNumber} confirmed${extra.total ? ` (Tk${Math.round(extra.total)})` : ""}. We'll SMS you when it ships. Thank you!`,
    packed: `${BRAND}: Order #${orderNumber} is packed and handed to the courier. It's on its way!`,
    shipped: `${BRAND}: Order #${orderNumber} shipped${extra.courier ? ` via ${extra.courier}` : ""}${extra.trackingCode ? `. Tracking: ${extra.trackingCode}` : ""}.`,
    delivered: `${BRAND}: Order #${orderNumber} delivered. Thanks for shopping with us!`,
    cancelled: `${BRAND}: Order #${orderNumber} has been cancelled. If this is unexpected, please contact us.`,
  };
  const message = templates[status];
  if (!message) return false;
  return sendSms(phone, message);
}
