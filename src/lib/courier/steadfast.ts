/**
 * Steadfast Courier API adapter.
 * Docs: https://docs.google.com/document/d/e/2PACX-1vTi0sTyR353xu1AK0nR8E_WKe5onCkUXGEf4spmKO4xoFvBSvfbtVUadkw2GAiK6qOtwvJEzW7fpH4R/pub
 * Base: https://portal.packzy.com/api/v1 — auth via Api-Key / Secret-Key headers.
 */

import type { ParcelInput, DispatchResult, CourierStatusResult } from "./types";

const BASE_URL = process.env.STEADFAST_BASE_URL ?? "https://portal.packzy.com/api/v1";

function credentials() {
  const apiKey = process.env.STEADFAST_API_KEY;
  const secretKey = process.env.STEADFAST_SECRET_KEY;
  if (!apiKey || !secretKey) return null;
  return { "Api-Key": apiKey, "Secret-Key": secretKey, "Content-Type": "application/json" };
}

export function steadfastConfigured(): boolean {
  return credentials() !== null;
}

export async function steadfastCreateOrder(parcel: ParcelInput): Promise<DispatchResult> {
  const headers = credentials();
  if (!headers) return { ok: false, courier: "steadfast", error: "Steadfast API keys not configured" };

  try {
    const res = await fetch(`${BASE_URL}/create_order`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        invoice: parcel.invoice,
        recipient_name: parcel.recipientName.slice(0, 100),
        recipient_phone: parcel.recipientPhone,
        recipient_address: `${parcel.recipientAddress}, ${parcel.recipientCity}`.slice(0, 250),
        cod_amount: parcel.codAmount,
        note: parcel.note ?? parcel.itemDescription.slice(0, 200),
      }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || data.status !== 200 || !data.consignment) {
      const msg = data?.errors ? JSON.stringify(data.errors) : (data?.message ?? `HTTP ${res.status}`);
      return { ok: false, courier: "steadfast", error: `Steadfast: ${msg}` };
    }

    return {
      ok: true,
      courier: "steadfast",
      consignmentId: String(data.consignment.consignment_id),
      trackingCode: data.consignment.tracking_code ?? undefined,
      status: data.consignment.status ?? "in_review",
    };
  } catch (err) {
    return { ok: false, courier: "steadfast", error: `Steadfast request failed: ${(err as Error).message}` };
  }
}

// Steadfast delivery_status values → our terminal order statuses.
const TERMINAL_MAP: Record<string, "delivered" | "cancelled"> = {
  delivered: "delivered",
  partial_delivered: "delivered",
  cancelled: "cancelled",
  cancelled_approval_pending: "cancelled",
};

export async function steadfastCheckStatus(invoice: string): Promise<CourierStatusResult> {
  const headers = credentials();
  if (!headers) return { ok: false, error: "Steadfast API keys not configured" };

  try {
    const res = await fetch(`${BASE_URL}/status_by_invoice/${encodeURIComponent(invoice)}`, { headers });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.status !== 200) {
      return { ok: false, error: data?.message ?? `HTTP ${res.status}` };
    }
    const status = String(data.delivery_status ?? "");
    return { ok: true, status, normalized: TERMINAL_MAP[status] ?? null };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
