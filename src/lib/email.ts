import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { EMAIL } from "@/lib/brand";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM    = process.env.EMAIL_FROM ?? "Aura Goli <no-reply@auragoli.com>";
const BRAND   = "Aura Goli";

// ─── Unsubscribe / suppression ────────────────────────────────────────────────
// Stateless HMAC token (no per-recipient DB row needed); secret reuses the JWT
// secret unless UNSUBSCRIBE_SECRET is set.
const UNSUB_SECRET = process.env.UNSUBSCRIBE_SECRET ?? process.env.JWT_ACCESS_SECRET ?? "unsubscribe-dev-secret";

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", UNSUB_SECRET).update(email.toLowerCase()).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(email));
  const got = Buffer.from(token);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

function unsubscribeUrl(email: string): string {
  return `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email.toLowerCase())}&token=${unsubscribeToken(email)}`;
}

// Suppressed if the address opted out of the newsletter OR a matching user turned
// email notifications off. Covers guests (by email) and account holders.
async function isSuppressed(email: string): Promise<boolean> {
  const lower = email.toLowerCase();
  const sub = await prisma.newsletterSubscriber
    .findUnique({ where: { email: lower }, select: { unsubscribedAt: true } })
    .catch(() => null);
  if (sub?.unsubscribedAt) return true;

  const user = await prisma.user.findUnique({ where: { email: lower }, select: { id: true } }).catch(() => null);
  if (user) {
    const pref = await prisma.notificationPreference
      .findUnique({ where: { userId: user.id }, select: { emailOn: true } })
      .catch(() => null);
    if (pref && pref.emailOn === false) return true;
  }
  return false;
}

function marketingFooter(url: string): string {
  return `<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:16px auto 0;">
    <tr><td style="padding:0 32px 24px;text-align:center;font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:${EMAIL.textFaint};">
      Aura Goli &middot; Dhaka, Bangladesh<br/>
      You're receiving this because you shopped with or subscribed to Aura Goli.
      <a href="${url}" style="color:${EMAIL.textFaint};text-decoration:underline;">Unsubscribe</a>
    </td></tr>
  </table>`;
}

// `marketing` emails honour unsubscribe state and carry RFC-8058 one-click headers
// + a footer. Transactional emails (orders, auth) are always delivered.
async function send(to: string, subject: string, html: string, opts?: { marketing?: boolean }) {
  if (opts?.marketing && (await isSuppressed(to))) {
    console.log(`[EMAIL] suppressed (opted out): ${to} | ${subject}`);
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] No RESEND_API_KEY — skipping. To: ${to} | Subject: ${subject}`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  let body = html;
  const headers: Record<string, string> = {};
  if (opts?.marketing) {
    const url = unsubscribeUrl(to);
    headers["List-Unsubscribe"] = `<${url}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    body = html.includes("</body>") ? html.replace("</body>", `${marketingFooter(url)}</body>`) : html + marketingFooter(url);
  }
  await resend.emails.send({ from: FROM, to, subject, html: body, headers });
}

/* ─── Order Confirmation ──────────────────────────────────── */

export interface OrderEmailItem {
  name: string;
  color?: string | null;
  size?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: OrderEmailItem[];
  subtotal: number;
  shippingFee: number;
  giftFee?: number;
  discount: number;
  total: number;
  paymentMethod: string;
  couponCode?: string | null;
  isGift?: boolean;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    postalCode?: string;
    country?: string;
  };
  createdAt?: Date;
}

function paymentLabel(method: string) {
  const map: Record<string, string> = {
    cod: "Cash on Delivery",
    card: "Card",
  };
  return map[method] ?? method;
}

function fmt(n: number) {
  return "৳" + n.toLocaleString("en-BD");
}

function orderConfirmationHtml(data: OrderEmailData): string {
  const {
    orderNumber, customerName, items,
    subtotal, shippingFee, giftFee = 0, discount, total,
    paymentMethod, couponCode, shippingAddress, createdAt, isGift,
  } = data;

  const date = (createdAt ?? new Date()).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const itemRows = items.map((item) => {
    const variant = [item.color, item.size].filter(Boolean).join(" / ");
    return `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid ${EMAIL.line};vertical-align:top;font-family:Arial,sans-serif;">
          <span style="display:block;font-size:14px;font-weight:600;color:${EMAIL.headerBg};margin-bottom:3px;">${item.name}</span>
          ${variant ? `<span style="display:block;font-size:12px;color:${EMAIL.textSubtle};margin-bottom:2px;">${variant}</span>` : ""}
          ${item.sku ? `<span style="display:block;font-size:11px;color:${EMAIL.textFaint};font-family:monospace;">SKU: ${item.sku}</span>` : ""}
        </td>
        <td style="padding:14px 16px;border-bottom:1px solid ${EMAIL.line};text-align:center;vertical-align:top;font-family:Arial,sans-serif;font-size:14px;color:${EMAIL.textMuted};font-weight:500;white-space:nowrap;">
          &times;${item.quantity}
        </td>
        <td style="padding:14px 16px;border-bottom:1px solid ${EMAIL.line};text-align:right;vertical-align:top;font-family:Arial,sans-serif;white-space:nowrap;">
          <span style="display:block;font-size:14px;font-weight:700;color:${EMAIL.headerBg};">${fmt(item.unitPrice * item.quantity)}</span>
          ${item.quantity > 1 ? `<span style="display:block;font-size:11px;color:${EMAIL.textFaint};">${fmt(item.unitPrice)} each</span>` : ""}
        </td>
      </tr>`;
  }).join("");

  const steps = ["Order Packed", "Quality Check", "Dispatched", "Delivered"];

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Order Confirmed &mdash; ${BRAND}</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL.bodyBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL.bodyBg};">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

        <!-- ═══ HEADER ═══ -->
        <tr>
          <td style="background-color:${EMAIL.headerBg};border-radius:16px 16px 0 0;padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:28px 36px 22px;">
                  <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:${EMAIL.ivory};letter-spacing:2px;">Aura <span style="color:${EMAIL.accent};">Goli</span></span><br>
                  <span style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#6a6880;">Premium Clothing &middot; Dhaka</span>
                </td>
                <td align="right" style="padding:28px 36px 22px;vertical-align:middle;">
                  <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:${EMAIL.accent};text-transform:uppercase;letter-spacing:2px;border:1px solid #4a3f20;background-color:#1e1a2e;padding:6px 14px;border-radius:20px;">&#10003; Confirmed</span>
                </td>
              </tr>
            </table>
            <!-- gold line -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td height="3" style="background-color:${EMAIL.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- ═══ HERO ═══ -->
        <tr>
          <td style="background-color:${EMAIL.ivory};padding:44px 36px 36px;" align="center">
            <!-- checkmark circle — table-based, no flex -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 20px;">
              <tr>
                <td width="68" height="68" align="center" valign="middle"
                  style="width:68px;height:68px;background-color:${EMAIL.headerBg};border-radius:34px;text-align:center;vertical-align:middle;">
                  <span style="font-family:Arial,sans-serif;font-size:30px;font-weight:700;color:${EMAIL.accent};line-height:68px;display:block;">&#10003;</span>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;color:${EMAIL.headerBg};letter-spacing:-0.5px;">
              Thank you, ${customerName.split(" ")[0]}!
            </h1>
            <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:15px;color:${EMAIL.textMuted};line-height:1.6;">
              Your order has been placed and is being prepared with care.
            </p>

            <!-- order number pill -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="background-color:${EMAIL.headerBg};border-radius:24px;padding:11px 28px;" align="center">
                  <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${EMAIL.accent};letter-spacing:1.5px;">Order #${orderNumber}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- divider -->
        <tr>
          <td style="background-color:${EMAIL.ivory};padding:0 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td height="1" style="background-color:${EMAIL.line};font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- ═══ INVOICE ═══ -->
        <tr>
          <td style="background-color:${EMAIL.ivory};padding:32px 36px 0;">

            <!-- invoice meta row -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="vertical-align:top;">
                  <span style="display:block;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:${EMAIL.accent};margin-bottom:4px;">Invoice</span>
                  <span style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:${EMAIL.headerBg};">${orderNumber}</span>
                </td>
                <td align="right" style="vertical-align:top;">
                  <span style="display:block;font-family:Arial,sans-serif;font-size:11px;color:${EMAIL.textSubtle};margin-bottom:2px;">Date</span>
                  <span style="display:block;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:${EMAIL.headerBg};margin-bottom:8px;">${date}</span>
                  <span style="display:block;font-family:Arial,sans-serif;font-size:11px;color:${EMAIL.textSubtle};margin-bottom:2px;">Payment</span>
                  <span style="display:block;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:${EMAIL.headerBg};">${paymentLabel(paymentMethod)}</span>
                </td>
              </tr>
            </table>

            <!-- items table -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL.line};border-radius:10px;overflow:hidden;">
              <tr style="background-color:${EMAIL.cardBg};">
                <th align="left" style="padding:10px 16px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${EMAIL.textSubtle};border-bottom:1px solid ${EMAIL.line};">Item</th>
                <th align="center" style="padding:10px 16px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${EMAIL.textSubtle};border-bottom:1px solid ${EMAIL.line};width:48px;">Qty</th>
                <th align="right" style="padding:10px 16px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${EMAIL.textSubtle};border-bottom:1px solid ${EMAIL.line};white-space:nowrap;">Amount</th>
              </tr>
              ${itemRows}
              <!-- subtotal -->
              <tr style="background-color:${EMAIL.cardBg};">
                <td colspan="2" style="padding:11px 16px;font-family:Arial,sans-serif;font-size:13px;color:${EMAIL.textMuted};border-top:1px solid ${EMAIL.line};">Subtotal</td>
                <td align="right" style="padding:11px 16px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:${EMAIL.headerBg};border-top:1px solid ${EMAIL.line};white-space:nowrap;">${fmt(subtotal)}</td>
              </tr>
              <!-- shipping -->
              <tr style="background-color:${EMAIL.cardBg};">
                <td colspan="2" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;color:${EMAIL.textMuted};">
                  Shipping${shippingFee === 0 ? ` &nbsp;<span style="color:${EMAIL.success};font-size:11px;font-weight:700;">FREE</span>` : ""}
                </td>
                <td align="right" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;white-space:nowrap;color:${shippingFee === 0 ? EMAIL.success : EMAIL.headerBg};">${shippingFee === 0 ? "&#2547;0" : fmt(shippingFee)}</td>
              </tr>
              ${isGift ? `
              <!-- gift packaging -->
              <tr style="background-color:${EMAIL.cardBg};">
                <td colspan="2" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;color:${EMAIL.accent};">&#127873; Gift Packaging</td>
                <td align="right" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:${EMAIL.accent};white-space:nowrap;">+${fmt(giftFee)}</td>
              </tr>` : ""}
              ${discount > 0 ? `
              <!-- discount -->
              <tr style="background-color:${EMAIL.cardBg};">
                <td colspan="2" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;color:${EMAIL.success};">Discount${couponCode ? ` (${couponCode})` : ""}</td>
                <td align="right" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:${EMAIL.success};white-space:nowrap;">-${fmt(discount)}</td>
              </tr>` : ""}
              <!-- grand total -->
              <tr style="background-color:${EMAIL.headerBg};">
                <td colspan="2" style="padding:16px 20px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${EMAIL.ivory};border-top:2px solid ${EMAIL.accent};">Total Charged</td>
                <td align="right" style="padding:16px 20px;font-family:Georgia,serif;font-size:22px;font-weight:700;color:${EMAIL.accent};border-top:2px solid ${EMAIL.accent};white-space:nowrap;">${fmt(total)}</td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ═══ SHIP TO + DELIVERY ═══ -->
        <tr>
          <td style="background-color:${EMAIL.ivory};padding:24px 36px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48%" style="vertical-align:top;padding-right:10px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL.cardBg};border:1px solid ${EMAIL.line};border-radius:10px;">
                    <tr><td style="padding:18px 20px;">
                      <span style="display:block;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${EMAIL.accent};margin-bottom:10px;">Ship To</span>
                      <span style="display:block;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:${EMAIL.headerBg};margin-bottom:5px;">${shippingAddress.name}</span>
                      <span style="display:block;font-family:Arial,sans-serif;font-size:13px;color:${EMAIL.textMuted};line-height:1.7;">${shippingAddress.address}<br>${shippingAddress.city}${shippingAddress.postalCode ? " " + shippingAddress.postalCode : ""}<br>${shippingAddress.country ?? "Bangladesh"}</span>
                      <span style="display:block;font-family:Arial,sans-serif;font-size:13px;color:${EMAIL.textMuted};margin-top:8px;">${shippingAddress.phone}</span>
                    </td></tr>
                  </table>
                </td>
                <td width="52%" style="vertical-align:top;padding-left:10px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL.cardBg};border:1px solid ${EMAIL.line};border-radius:10px;">
                    <tr><td style="padding:18px 20px;">
                      <span style="display:block;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${EMAIL.accent};margin-bottom:10px;">Delivery</span>
                      <span style="display:block;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:${EMAIL.headerBg};margin-bottom:6px;">${shippingAddress.city?.toLowerCase() === "dhaka" ? "1&ndash;2 Business Days" : "3&ndash;5 Business Days"}</span>
                      <span style="display:block;font-family:Arial,sans-serif;font-size:13px;color:${EMAIL.textMuted};line-height:1.5;">${paymentMethod === "cod" ? "Pay when your order arrives at the door." : "Payment confirmed. We&rsquo;ll notify you when it ships."}</span>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ CTA ═══ -->
        <tr>
          <td style="background-color:${EMAIL.ivory};padding:0 36px 36px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="background-color:${EMAIL.headerBg};border-radius:24px;padding:14px 36px;" align="center">
                  <a href="${APP_URL}/account/orders" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${EMAIL.accent};text-decoration:none;text-transform:uppercase;letter-spacing:2px;display:block;">Track Your Order &rarr;</a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${EMAIL.textFaint};text-align:center;">
              Questions? <a href="mailto:support@auragoli.com" style="color:${EMAIL.accent};text-decoration:none;">support@auragoli.com</a>
            </p>
          </td>
        </tr>

        <!-- ═══ WHAT HAPPENS NEXT ═══ -->
        <tr>
          <td style="background-color:${EMAIL.headerBg};border-radius:0 0 16px 16px;padding:28px 36px 32px;">
            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:${EMAIL.accent};">What Happens Next</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${steps.map((step, i) => {
                  const active = i === 0;
                  const circleBg  = active ? EMAIL.accent : "#1e1a2e";
                  const circleBdr = active ? EMAIL.accent : "#3a3560";
                  const numColor  = active ? EMAIL.accentFg : "#5a5580";
                  const lblColor  = active ? EMAIL.ivory : "#4a4870";
                  return `
                <td width="25%" align="center" valign="top" style="padding:0 6px;">
                  <!-- numbered circle -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 10px;">
                    <tr>
                      <td width="36" height="36" align="center" valign="middle"
                        style="width:36px;height:36px;background-color:${circleBg};border-radius:18px;border:1px solid ${circleBdr};text-align:center;vertical-align:middle;">
                        <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:${numColor};line-height:36px;display:block;">${i + 1}</span>
                      </td>
                    </tr>
                  </table>
                  <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:600;color:${lblColor};line-height:1.4;display:block;text-align:center;">${step}</span>
                </td>`;
                }).join("")}
              </tr>
            </table>

            <!-- connector line between steps -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:0;">
              <tr>
                <td style="padding:0 18px 0 72px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr><td height="1" style="background-color:#2a2750;font-size:0;line-height:0;">&nbsp;</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ FOOTER ═══ -->
        <tr>
          <td style="padding:28px 0 8px;" align="center">
            <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:${EMAIL.textSubtle};">${BRAND} &middot; Dhaka, Bangladesh</p>
            <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;color:${EMAIL.textFaint};">
              <a href="${APP_URL}/shop" style="color:${EMAIL.textFaint};text-decoration:none;">Shop</a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/account/orders" style="color:${EMAIL.textFaint};text-decoration:none;">My Orders</a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/contact" style="color:${EMAIL.textFaint};text-decoration:none;">Contact</a>
            </p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:${EMAIL.textFaint};">You&rsquo;re receiving this because you placed an order with us.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export async function sendOrderConfirmation(data: OrderEmailData) {
  const html = orderConfirmationHtml(data);
  await send(
    data.customerEmail,
    `Order confirmed #${data.orderNumber} — ${BRAND}`,
    html,
  );
}

/* ─── Other transactional emails ──────────────────────────── */

export async function sendOrderStatusUpdate(to: string, orderNumber: string, status: string) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await send(
    to,
    `Order update: #${orderNumber} — ${BRAND}`,
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:${EMAIL.bodyBg};padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${EMAIL.ivory};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${EMAIL.headerBg};padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${EMAIL.ivory};">Aura <span style="color:${EMAIL.accent};">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:${EMAIL.headerBg};margin:0 0 12px;">Order Update</h2>
          <p style="font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:14px;line-height:1.6;">
            Your order <strong style="color:${EMAIL.headerBg};">#${orderNumber}</strong> has been updated to:
          </p>
          <div style="display:inline-block;background:${EMAIL.headerBg};color:${EMAIL.accent};padding:10px 24px;border-radius:100px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;margin:12px 0;">
            ${label}
          </div>
          <p style="font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:13px;margin-top:20px;">
            <a href="${APP_URL}/account/orders" style="color:${EMAIL.accent};font-weight:700;text-decoration:none;">View your order →</a>
          </p>
        </td></tr>
      </table>
    </body></html>`,
  );
}

export async function sendEmailVerification(to: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await send(
    to,
    `Verify your email — ${BRAND}`,
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:${EMAIL.bodyBg};padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${EMAIL.ivory};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${EMAIL.headerBg};padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${EMAIL.ivory};">Aura <span style="color:${EMAIL.accent};">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:${EMAIL.headerBg};margin:0 0 12px;">Verify your email</h2>
          <p style="font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:14px;line-height:1.6;">Click the button below to verify your email address. This link expires in 24 hours.</p>
          <a href="${link}" style="display:inline-block;background:${EMAIL.headerBg};color:${EMAIL.accent};text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:8px;">Verify Email →</a>
        </td></tr>
      </table>
    </body></html>`,
  );
}

export async function sendPasswordReset(to: string, token: string) {
  const link = `${APP_URL}/reset-password/${token}`;
  await send(
    to,
    `Reset your password — ${BRAND}`,
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:${EMAIL.bodyBg};padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${EMAIL.ivory};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${EMAIL.headerBg};padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${EMAIL.ivory};">Aura <span style="color:${EMAIL.accent};">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:${EMAIL.headerBg};margin:0 0 12px;">Reset your password</h2>
          <p style="font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:14px;line-height:1.6;">We received a request to reset your password. Click below — this link expires in 15 minutes.</p>
          <a href="${link}" style="display:inline-block;background:${EMAIL.headerBg};color:${EMAIL.accent};text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:8px;">Reset Password →</a>
          <p style="font-family:Arial,sans-serif;font-size:12px;color:${EMAIL.textFaint};margin-top:20px;">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </body></html>`,
  );
}

export async function sendWelcomeEmail(to: string, name: string) {
  await send(
    to,
    `Welcome to ${BRAND}!`,
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:${EMAIL.bodyBg};padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${EMAIL.ivory};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${EMAIL.headerBg};padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${EMAIL.ivory};">Aura <span style="color:${EMAIL.accent};">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:${EMAIL.headerBg};margin:0 0 12px;">Welcome, ${name}.</h2>
          <p style="font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:14px;line-height:1.6;">You're now part of the Aura Goli inner circle. Expect quality over quantity — always.</p>
          <a href="${APP_URL}/shop" style="display:inline-block;background:${EMAIL.headerBg};color:${EMAIL.accent};text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:16px;">Shop the Collection →</a>
        </td></tr>
      </table>
    </body></html>`,
  );
}

export async function sendBackInStockNotification(to: string, productName: string, productSlug: string) {
  const link = `${APP_URL}/products/${productSlug}`;
  await send(
    to,
    `Back in stock: ${productName} — ${BRAND}`,
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:${EMAIL.bodyBg};padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${EMAIL.ivory};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${EMAIL.headerBg};padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${EMAIL.ivory};">Aura <span style="color:${EMAIL.accent};">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:${EMAIL.headerBg};margin:0 0 12px;">It's back.</h2>
          <p style="font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:14px;line-height:1.6;"><strong style="color:${EMAIL.headerBg};">${productName}</strong> is back in stock. Grab it before it sells out again.</p>
          <a href="${link}" style="display:inline-block;background:${EMAIL.accent};color:${EMAIL.accentFg};text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:16px;">Shop Now →</a>
        </td></tr>
      </table>
    </body></html>`,
  );
}

/* ─── Newsletter welcome ──────────────────────────────────── */

export async function sendNewsletterWelcome(to: string) {
  const link = `${APP_URL}/shop`;
  await send(
    to,
    `Welcome to the Aura — ${BRAND}`,
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:${EMAIL.bodyBg};padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${EMAIL.ivory};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${EMAIL.headerBg};padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${EMAIL.ivory};">Aura <span style="color:${EMAIL.accent};">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:${EMAIL.headerBg};margin:0 0 12px;">You're in the circle.</h2>
          <p style="font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:14px;line-height:1.6;">Thanks for joining the Aura. You'll be first to know about limited drops, exclusive events, and the stories behind each collection &mdash; no noise, just the good stuff.</p>
          <p style="font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:14px;line-height:1.6;">Premium clothing, crafted with intention. Have a look around.</p>
          <a href="${link}" style="display:inline-block;background:${EMAIL.accent};color:${EMAIL.accentFg};text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:8px;">Explore the Collection →</a>
        </td></tr>
      </table>
    </body></html>`,
    { marketing: true },
  );
}

/* ─── Abandoned cart recovery ─────────────────────────────── */

export async function sendAbandonedCartEmail(
  to: string,
  customerName: string,
  items: { name: string; quantity: number }[],
) {
  const link = `${APP_URL}/cart`;
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;font-family:Arial,sans-serif;color:${EMAIL.headerBg};font-size:14px;">${i.name}</td>
         <td style="padding:8px 0;font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:14px;text-align:right;">×${i.quantity}</td></tr>`,
    )
    .join("");
  await send(
    to,
    `You left something behind — ${BRAND}`,
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:${EMAIL.bodyBg};padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${EMAIL.ivory};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${EMAIL.headerBg};padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${EMAIL.ivory};">Aura <span style="color:${EMAIL.accent};">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:${EMAIL.headerBg};margin:0 0 12px;">Still thinking it over, ${customerName}?</h2>
          <p style="font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:14px;line-height:1.6;">Your cart is waiting. We saved these pieces for you — but stock moves fast.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid ${EMAIL.line};border-bottom:1px solid ${EMAIL.line};">${rows}</table>
          <a href="${link}" style="display:inline-block;background:${EMAIL.accent};color:${EMAIL.accentFg};text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:8px;">Complete Your Order →</a>
        </td></tr>
      </table>
    </body></html>`,
    { marketing: true },
  );
}

/* ─── Post-delivery review request ────────────────────────── */

export async function sendReviewRequest(to: string, customerName: string, productName: string, productSlug: string) {
  const link = `${APP_URL}/products/${productSlug}#reviews`;
  await send(
    to,
    `How are you liking your ${productName}? — ${BRAND}`,
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:${EMAIL.bodyBg};padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${EMAIL.ivory};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${EMAIL.headerBg};padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${EMAIL.ivory};">Aura <span style="color:${EMAIL.accent};">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:${EMAIL.headerBg};margin:0 0 12px;">How did we do, ${customerName}?</h2>
          <p style="font-family:Arial,sans-serif;color:${EMAIL.textMuted};font-size:14px;line-height:1.6;">Your order has been delivered. We'd love to hear what you think of your <strong style="color:${EMAIL.headerBg};">${productName}</strong> — your review helps other shoppers and takes less than a minute.</p>
          <a href="${link}" style="display:inline-block;background:${EMAIL.accent};color:${EMAIL.accentFg};text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:16px;">Leave a Review →</a>
        </td></tr>
      </table>
    </body></html>`,
    { marketing: true },
  );
}
