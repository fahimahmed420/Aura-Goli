const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM    = process.env.EMAIL_FROM ?? "Aura Goli <no-reply@auragoli.com>";
const BRAND   = "Aura Goli";

async function send(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] No RESEND_API_KEY — skipping. To: ${to} | Subject: ${subject}`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({ from: FROM, to, subject, html });
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
    bkash: "bKash",
    nagad: "Nagad",
    rocket: "Rocket",
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
        <td style="padding:14px 16px;border-bottom:1px solid #e8e4dc;vertical-align:top;font-family:Arial,sans-serif;">
          <span style="display:block;font-size:14px;font-weight:600;color:#12103a;margin-bottom:3px;">${item.name}</span>
          ${variant ? `<span style="display:block;font-size:12px;color:#8a8070;margin-bottom:2px;">${variant}</span>` : ""}
          ${item.sku ? `<span style="display:block;font-size:11px;color:#b0a898;font-family:monospace;">SKU: ${item.sku}</span>` : ""}
        </td>
        <td style="padding:14px 16px;border-bottom:1px solid #e8e4dc;text-align:center;vertical-align:top;font-family:Arial,sans-serif;font-size:14px;color:#5a5358;font-weight:500;white-space:nowrap;">
          &times;${item.quantity}
        </td>
        <td style="padding:14px 16px;border-bottom:1px solid #e8e4dc;text-align:right;vertical-align:top;font-family:Arial,sans-serif;white-space:nowrap;">
          <span style="display:block;font-size:14px;font-weight:700;color:#12103a;">${fmt(item.unitPrice * item.quantity)}</span>
          ${item.quantity > 1 ? `<span style="display:block;font-size:11px;color:#b0a898;">${fmt(item.unitPrice)} each</span>` : ""}
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
<body style="margin:0;padding:0;background-color:#f2ede4;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2ede4;">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

        <!-- ═══ HEADER ═══ -->
        <tr>
          <td style="background-color:#12103a;border-radius:16px 16px 0 0;padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:28px 36px 22px;">
                  <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#faf7f0;letter-spacing:2px;">Aura <span style="color:#c9a84c;">Goli</span></span><br>
                  <span style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#6a6880;">Premium T-Shirts &middot; Dhaka</span>
                </td>
                <td align="right" style="padding:28px 36px 22px;vertical-align:middle;">
                  <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#c9a84c;text-transform:uppercase;letter-spacing:2px;border:1px solid #4a3f20;background-color:#1e1a2e;padding:6px 14px;border-radius:20px;">&#10003; Confirmed</span>
                </td>
              </tr>
            </table>
            <!-- gold line -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td height="3" style="background-color:#c9a84c;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- ═══ HERO ═══ -->
        <tr>
          <td style="background-color:#faf7f0;padding:44px 36px 36px;" align="center">
            <!-- checkmark circle — table-based, no flex -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 20px;">
              <tr>
                <td width="68" height="68" align="center" valign="middle"
                  style="width:68px;height:68px;background-color:#12103a;border-radius:34px;text-align:center;vertical-align:middle;">
                  <span style="font-family:Arial,sans-serif;font-size:30px;font-weight:700;color:#c9a84c;line-height:68px;display:block;">&#10003;</span>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;color:#12103a;letter-spacing:-0.5px;">
              Thank you, ${customerName.split(" ")[0]}!
            </h1>
            <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:15px;color:#5a5358;line-height:1.6;">
              Your order has been placed and is being prepared with care.
            </p>

            <!-- order number pill -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="background-color:#12103a;border-radius:24px;padding:11px 28px;" align="center">
                  <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#c9a84c;letter-spacing:1.5px;">Order #${orderNumber}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- divider -->
        <tr>
          <td style="background-color:#faf7f0;padding:0 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td height="1" style="background-color:#e0d8cc;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- ═══ INVOICE ═══ -->
        <tr>
          <td style="background-color:#faf7f0;padding:32px 36px 0;">

            <!-- invoice meta row -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="vertical-align:top;">
                  <span style="display:block;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#c9a84c;margin-bottom:4px;">Invoice</span>
                  <span style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#12103a;">${orderNumber}</span>
                </td>
                <td align="right" style="vertical-align:top;">
                  <span style="display:block;font-family:Arial,sans-serif;font-size:11px;color:#8a8070;margin-bottom:2px;">Date</span>
                  <span style="display:block;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#12103a;margin-bottom:8px;">${date}</span>
                  <span style="display:block;font-family:Arial,sans-serif;font-size:11px;color:#8a8070;margin-bottom:2px;">Payment</span>
                  <span style="display:block;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#12103a;">${paymentLabel(paymentMethod)}</span>
                </td>
              </tr>
            </table>

            <!-- items table -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e8e4dc;border-radius:10px;overflow:hidden;">
              <tr style="background-color:#f0ebe0;">
                <th align="left" style="padding:10px 16px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#8a8070;border-bottom:1px solid #e8e4dc;">Item</th>
                <th align="center" style="padding:10px 16px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#8a8070;border-bottom:1px solid #e8e4dc;width:48px;">Qty</th>
                <th align="right" style="padding:10px 16px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#8a8070;border-bottom:1px solid #e8e4dc;white-space:nowrap;">Amount</th>
              </tr>
              ${itemRows}
              <!-- subtotal -->
              <tr style="background-color:#f5f0e8;">
                <td colspan="2" style="padding:11px 16px;font-family:Arial,sans-serif;font-size:13px;color:#5a5358;border-top:1px solid #e8e4dc;">Subtotal</td>
                <td align="right" style="padding:11px 16px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#12103a;border-top:1px solid #e8e4dc;white-space:nowrap;">${fmt(subtotal)}</td>
              </tr>
              <!-- shipping -->
              <tr style="background-color:#f5f0e8;">
                <td colspan="2" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;color:#5a5358;">
                  Shipping${shippingFee === 0 ? ' &nbsp;<span style="color:#16a34a;font-size:11px;font-weight:700;">FREE</span>' : ""}
                </td>
                <td align="right" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;white-space:nowrap;${shippingFee === 0 ? "color:#16a34a;" : "color:#12103a;"}">${shippingFee === 0 ? "&#2547;0" : fmt(shippingFee)}</td>
              </tr>
              ${isGift ? `
              <!-- gift packaging -->
              <tr style="background-color:#f5f0e8;">
                <td colspan="2" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;color:#5951b4;">&#127873; Gift Packaging</td>
                <td align="right" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#5951b4;white-space:nowrap;">+${fmt(giftFee)}</td>
              </tr>` : ""}
              ${discount > 0 ? `
              <!-- discount -->
              <tr style="background-color:#f5f0e8;">
                <td colspan="2" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;color:#16a34a;">Discount${couponCode ? ` (${couponCode})` : ""}</td>
                <td align="right" style="padding:8px 16px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#16a34a;white-space:nowrap;">-${fmt(discount)}</td>
              </tr>` : ""}
              <!-- grand total -->
              <tr style="background-color:#12103a;">
                <td colspan="2" style="padding:16px 20px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#faf7f0;border-top:2px solid #c9a84c;">Total Charged</td>
                <td align="right" style="padding:16px 20px;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#c9a84c;border-top:2px solid #c9a84c;white-space:nowrap;">${fmt(total)}</td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ═══ SHIP TO + DELIVERY ═══ -->
        <tr>
          <td style="background-color:#faf7f0;padding:24px 36px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48%" style="vertical-align:top;padding-right:10px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0ebe0;border:1px solid #e0d8cc;border-radius:10px;">
                    <tr><td style="padding:18px 20px;">
                      <span style="display:block;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#c9a84c;margin-bottom:10px;">Ship To</span>
                      <span style="display:block;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#12103a;margin-bottom:5px;">${shippingAddress.name}</span>
                      <span style="display:block;font-family:Arial,sans-serif;font-size:13px;color:#5a5358;line-height:1.7;">${shippingAddress.address}<br>${shippingAddress.city}${shippingAddress.postalCode ? " " + shippingAddress.postalCode : ""}<br>${shippingAddress.country ?? "Bangladesh"}</span>
                      <span style="display:block;font-family:Arial,sans-serif;font-size:13px;color:#5a5358;margin-top:8px;">${shippingAddress.phone}</span>
                    </td></tr>
                  </table>
                </td>
                <td width="52%" style="vertical-align:top;padding-left:10px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0ebe0;border:1px solid #e0d8cc;border-radius:10px;">
                    <tr><td style="padding:18px 20px;">
                      <span style="display:block;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#c9a84c;margin-bottom:10px;">Delivery</span>
                      <span style="display:block;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#12103a;margin-bottom:6px;">${shippingAddress.city?.toLowerCase() === "dhaka" ? "1&ndash;2 Business Days" : "3&ndash;5 Business Days"}</span>
                      <span style="display:block;font-family:Arial,sans-serif;font-size:13px;color:#5a5358;line-height:1.5;">${paymentMethod === "cod" ? "Pay when your order arrives at the door." : "Payment confirmed. We&rsquo;ll notify you when it ships."}</span>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ CTA ═══ -->
        <tr>
          <td style="background-color:#faf7f0;padding:0 36px 36px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="background-color:#12103a;border-radius:24px;padding:14px 36px;" align="center">
                  <a href="${APP_URL}/account/orders" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#c9a84c;text-decoration:none;text-transform:uppercase;letter-spacing:2px;display:block;">Track Your Order &rarr;</a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#b0a898;text-align:center;">
              Questions? <a href="mailto:support@auragoli.com" style="color:#c9a84c;text-decoration:none;">support@auragoli.com</a>
            </p>
          </td>
        </tr>

        <!-- ═══ WHAT HAPPENS NEXT ═══ -->
        <tr>
          <td style="background-color:#12103a;border-radius:0 0 16px 16px;padding:28px 36px 32px;">
            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#c9a84c;">What Happens Next</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${steps.map((step, i) => {
                  const active = i === 0;
                  const circleBg  = active ? "#c9a84c" : "#1e1a2e";
                  const circleBdr = active ? "#c9a84c" : "#3a3560";
                  const numColor  = active ? "#0b0b14" : "#5a5580";
                  const lblColor  = active ? "#faf7f0" : "#4a4870";
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
            <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#8a8070;">${BRAND} &middot; Dhaka, Bangladesh</p>
            <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;color:#b0a898;">
              <a href="${APP_URL}/shop" style="color:#b0a898;text-decoration:none;">Shop</a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/account/orders" style="color:#b0a898;text-decoration:none;">My Orders</a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/contact" style="color:#b0a898;text-decoration:none;">Contact</a>
            </p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#c8c0b5;">You&rsquo;re receiving this because you placed an order with us.</p>
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
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f2ede4;padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#faf7f0;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#12103a;padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#faf7f0;">Aura <span style="color:#c9a84c;">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:#12103a;margin:0 0 12px;">Order Update</h2>
          <p style="font-family:Arial,sans-serif;color:#5a5358;font-size:14px;line-height:1.6;">
            Your order <strong style="color:#12103a;">#${orderNumber}</strong> has been updated to:
          </p>
          <div style="display:inline-block;background:#12103a;color:#c9a84c;padding:10px 24px;border-radius:100px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;margin:12px 0;">
            ${label}
          </div>
          <p style="font-family:Arial,sans-serif;color:#5a5358;font-size:13px;margin-top:20px;">
            <a href="${APP_URL}/account/orders" style="color:#c9a84c;font-weight:700;text-decoration:none;">View your order →</a>
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
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f2ede4;padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#faf7f0;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#12103a;padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#faf7f0;">Aura <span style="color:#c9a84c;">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:#12103a;margin:0 0 12px;">Verify your email</h2>
          <p style="font-family:Arial,sans-serif;color:#5a5358;font-size:14px;line-height:1.6;">Click the button below to verify your email address. This link expires in 24 hours.</p>
          <a href="${link}" style="display:inline-block;background:#12103a;color:#c9a84c;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:8px;">Verify Email →</a>
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
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f2ede4;padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#faf7f0;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#12103a;padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#faf7f0;">Aura <span style="color:#c9a84c;">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:#12103a;margin:0 0 12px;">Reset your password</h2>
          <p style="font-family:Arial,sans-serif;color:#5a5358;font-size:14px;line-height:1.6;">We received a request to reset your password. Click below — this link expires in 15 minutes.</p>
          <a href="${link}" style="display:inline-block;background:#12103a;color:#c9a84c;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:8px;">Reset Password →</a>
          <p style="font-family:Arial,sans-serif;font-size:12px;color:#b0a898;margin-top:20px;">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </body></html>`,
  );
}

export async function sendWelcomeEmail(to: string, name: string) {
  await send(
    to,
    `Welcome to ${BRAND}!`,
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f2ede4;padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#faf7f0;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#12103a;padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#faf7f0;">Aura <span style="color:#c9a84c;">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:#12103a;margin:0 0 12px;">Welcome, ${name}.</h2>
          <p style="font-family:Arial,sans-serif;color:#5a5358;font-size:14px;line-height:1.6;">You're now part of the Aura Goli inner circle. Expect quality over quantity — always.</p>
          <a href="${APP_URL}/shop" style="display:inline-block;background:#12103a;color:#c9a84c;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:16px;">Shop the Collection →</a>
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
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f2ede4;padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#faf7f0;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#12103a;padding:24px 32px;">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#faf7f0;">Aura <span style="color:#c9a84c;">Goli</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;color:#12103a;margin:0 0 12px;">It's back.</h2>
          <p style="font-family:Arial,sans-serif;color:#5a5358;font-size:14px;line-height:1.6;"><strong style="color:#12103a;">${productName}</strong> is back in stock. Grab it before it sells out again.</p>
          <a href="${link}" style="display:inline-block;background:#c9a84c;color:#0b0b14;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;padding:14px 32px;border-radius:100px;margin-top:16px;">Shop Now →</a>
        </td></tr>
      </table>
    </body></html>`,
  );
}
