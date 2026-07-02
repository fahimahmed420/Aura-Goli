/**
 * COD risk assessment ("the bot").
 *
 * Verdict sources, in order:
 *  1. Prepaid orders — no COD risk, always dispatchable.
 *  2. Our own order history for this customer (phone/email/user id):
 *     a returning customer who has accepted deliveries is trusted; one who
 *     keeps cancelling is not.
 *  3. Optional external courier-history API (cross-courier success ratio by
 *     phone number) — configure COURIER_CHECK_API_URL/KEY to enable.
 */

import { prisma } from "@/lib/prisma";
import type { RiskAssessment } from "./types";

/** Normalize a BD phone to the local `01XXXXXXXXX` form. */
export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return "0" + digits.slice(3);
  if (digits.startsWith("88")) return digits.slice(2);
  return digits;
}

export function isValidBdPhone(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizeBdPhone(phone));
}

interface ExternalHistory { total: number; delivered: number; cancelled: number; }

/** Pluggable external phone-history check. Returns null when unconfigured/unavailable. */
async function externalCheck(phone: string): Promise<ExternalHistory | null> {
  const url = process.env.COURIER_CHECK_API_URL;
  if (!url) return null;
  try {
    const endpoint = url.includes("{phone}")
      ? url.replace("{phone}", encodeURIComponent(phone))
      : `${url}${url.includes("?") ? "&" : "?"}phone=${encodeURIComponent(phone)}`;
    const res = await fetch(endpoint, {
      headers: process.env.COURIER_CHECK_API_KEY
        ? { Authorization: `Bearer ${process.env.COURIER_CHECK_API_KEY}` }
        : undefined,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    // Accept the common response shapes of BD courier-check services.
    const summary = data?.courierData?.summary ?? data?.summary ?? data;
    const total = Number(summary?.total_parcel ?? summary?.total ?? 0);
    const delivered = Number(summary?.success_parcel ?? summary?.delivered ?? summary?.success ?? 0);
    const cancelled = Number(summary?.cancelled_parcel ?? summary?.cancelled ?? summary?.cancel ?? 0);
    if (!Number.isFinite(total) || total <= 0) return null;
    return { total, delivered, cancelled };
  } catch {
    return null;
  }
}

export async function assessCodRisk(order: {
  id: string;
  userId: string | null;
  guestEmail: string | null;
  paymentStatus: string;
  shippingAddress: unknown;
}): Promise<RiskAssessment> {
  if (order.paymentStatus === "paid") {
    return { verdict: "prepaid", reason: "Payment already received — no COD risk", deliveredCount: 0, cancelledCount: 0, source: "prepaid" };
  }

  const addr = order.shippingAddress as { phone?: string; email?: string } | null;
  const phone = addr?.phone ? normalizeBdPhone(addr.phone) : null;
  const email = (order.guestEmail ?? addr?.email ?? "").toLowerCase() || null;

  // Phone variants as they may appear in stored snapshots.
  const phoneVariants = phone ? [phone, `+88${phone}`, `88${phone}`] : [];

  const history = await prisma.order.findMany({
    where: {
      id: { not: order.id },
      OR: [
        ...(order.userId ? [{ userId: order.userId }] : []),
        ...(email ? [{ guestEmail: email }] : []),
        ...phoneVariants.map((p) => ({ shippingAddress: { path: ["phone"], equals: p } })),
      ],
    },
    select: { status: true },
    take: 100,
  });

  const delivered = history.filter((o) => o.status === "delivered").length;
  const cancelled = history.filter((o) => o.status === "cancelled" || o.status === "refunded").length;

  if (delivered >= 1 && cancelled === 0) {
    return { verdict: "good", reason: `Returning customer: ${delivered} delivered, 0 cancelled with us`, deliveredCount: delivered, cancelledCount: cancelled, source: "store-history" };
  }
  if (cancelled >= 2 && delivered === 0) {
    return { verdict: "risky", reason: `${cancelled} cancelled orders and no successful deliveries with us`, deliveredCount: delivered, cancelledCount: cancelled, source: "store-history" };
  }
  if (delivered >= 2 && delivered >= cancelled * 2) {
    return { verdict: "good", reason: `Mostly reliable: ${delivered} delivered vs ${cancelled} cancelled with us`, deliveredCount: delivered, cancelledCount: cancelled, source: "store-history" };
  }

  // No conclusive in-store history — consult the external service if configured.
  if (phone) {
    const ext = await externalCheck(phone);
    if (ext && ext.total >= 3) {
      const ratio = ext.delivered / ext.total;
      if (ratio >= 0.7) {
        return { verdict: "good", reason: `External check: ${ext.delivered}/${ext.total} parcels delivered (${Math.round(ratio * 100)}%)`, deliveredCount: ext.delivered, cancelledCount: ext.cancelled, source: "external" };
      }
      if (ratio < 0.4) {
        return { verdict: "risky", reason: `External check: only ${ext.delivered}/${ext.total} parcels delivered (${Math.round(ratio * 100)}%)`, deliveredCount: ext.delivered, cancelledCount: ext.cancelled, source: "external" };
      }
      return { verdict: "neutral", reason: `External check inconclusive: ${ext.delivered}/${ext.total} delivered`, deliveredCount: ext.delivered, cancelledCount: ext.cancelled, source: "external" };
    }
  }

  return {
    verdict: "neutral",
    reason: history.length === 0 ? "New customer — no delivery history yet" : `Limited history: ${delivered} delivered, ${cancelled} cancelled`,
    deliveredCount: delivered,
    cancelledCount: cancelled,
    source: "store-history",
  };
}
