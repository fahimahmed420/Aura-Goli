/**
 * Pathao Courier Merchant API adapter.
 * Docs: https://merchant.pathao.com/courier/developer-api
 * OAuth password-grant token, then order create. City/zone ids are resolved by
 * fuzzy-matching the checkout city/address against Pathao's own lists — if a
 * zone can't be matched confidently the dispatch fails (and the order is held
 * for manual handling) rather than guessing a wrong delivery zone.
 */

import type { ParcelInput, DispatchResult, CourierStatusResult } from "./types";

const BASE_URL = process.env.PATHAO_BASE_URL ?? "https://api-hermes.pathao.com";

interface PathaoToken { access_token: string; expiresAt: number; }
let cachedToken: PathaoToken | null = null;

export function pathaoConfigured(): boolean {
  return !!(
    process.env.PATHAO_CLIENT_ID &&
    process.env.PATHAO_CLIENT_SECRET &&
    process.env.PATHAO_USERNAME &&
    process.env.PATHAO_PASSWORD &&
    process.env.PATHAO_STORE_ID
  );
}

async function getToken(): Promise<string | null> {
  if (!pathaoConfigured()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.access_token;

  const res = await fetch(`${BASE_URL}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PATHAO_CLIENT_ID,
      client_secret: process.env.PATHAO_CLIENT_SECRET,
      grant_type: "password",
      username: process.env.PATHAO_USERNAME,
      password: process.env.PATHAO_PASSWORD,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) return null;
  cachedToken = {
    access_token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in ?? 3600) * 1000),
  };
  return cachedToken.access_token;
}

async function authedGet(token: string, path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  return res.json().catch(() => null);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Resolve Pathao city_id + zone_id from free-text city and address. */
async function resolveCityZone(token: string, city: string, address: string):
  Promise<{ cityId: number; zoneId: number } | { error: string }> {
  const cities = await authedGet(token, "/aladdin/api/v1/city-list");
  const cityList: { city_id: number; city_name: string }[] = cities?.data?.data ?? [];
  if (cityList.length === 0) return { error: "Pathao city list unavailable" };

  const cityMatch = cityList.find((c) => norm(c.city_name) === norm(city))
    ?? cityList.find((c) => norm(city).includes(norm(c.city_name)) || norm(c.city_name).includes(norm(city)));
  if (!cityMatch) return { error: `Pathao: no city match for "${city}"` };

  const zones = await authedGet(token, `/aladdin/api/v1/cities/${cityMatch.city_id}/zone-list`);
  const zoneList: { zone_id: number; zone_name: string }[] = zones?.data?.data ?? [];
  if (zoneList.length === 0) return { error: `Pathao: no zones for city "${cityMatch.city_name}"` };

  // Try to find a zone name inside the street address (e.g. "Banani", "Dhanmondi").
  const addr = norm(address);
  const zoneMatch = zoneList.find((z) => addr.includes(norm(z.zone_name)));
  if (!zoneMatch) return { error: `Pathao: could not detect a delivery zone from the address — pick manually` };

  return { cityId: cityMatch.city_id, zoneId: zoneMatch.zone_id };
}

export async function pathaoCreateOrder(parcel: ParcelInput): Promise<DispatchResult> {
  if (!pathaoConfigured()) return { ok: false, courier: "pathao", error: "Pathao API credentials not configured" };

  try {
    const token = await getToken();
    if (!token) return { ok: false, courier: "pathao", error: "Pathao: authentication failed" };

    const cityZone = await resolveCityZone(token, parcel.recipientCity, parcel.recipientAddress);
    if ("error" in cityZone) return { ok: false, courier: "pathao", error: cityZone.error };

    const res = await fetch(`${BASE_URL}/aladdin/api/v1/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: Number(process.env.PATHAO_STORE_ID),
        merchant_order_id: parcel.invoice,
        recipient_name: parcel.recipientName.slice(0, 100),
        recipient_phone: parcel.recipientPhone,
        recipient_address: `${parcel.recipientAddress}, ${parcel.recipientCity}`.slice(0, 220),
        recipient_city: cityZone.cityId,
        recipient_zone: cityZone.zoneId,
        delivery_type: 48, // normal delivery
        item_type: 2,      // parcel
        item_quantity: parcel.itemQuantity,
        item_weight: "0.5",
        amount_to_collect: parcel.codAmount,
        item_description: parcel.itemDescription.slice(0, 200),
        special_instruction: parcel.note ?? "",
      }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.data?.consignment_id) {
      const msg = data?.message ?? data?.errors ? JSON.stringify(data?.errors ?? data?.message) : `HTTP ${res.status}`;
      return { ok: false, courier: "pathao", error: `Pathao: ${msg}` };
    }

    return {
      ok: true,
      courier: "pathao",
      consignmentId: String(data.data.consignment_id),
      trackingCode: String(data.data.consignment_id),
      status: data.data.order_status ?? "Pending",
    };
  } catch (err) {
    return { ok: false, courier: "pathao", error: `Pathao request failed: ${(err as Error).message}` };
  }
}

// Pathao order_status values → our terminal order statuses.
const TERMINAL_MAP: Record<string, "delivered" | "cancelled"> = {
  delivered: "delivered",
  "partial delivery": "delivered",
  cancelled: "cancelled",
  "return": "cancelled",
  "paid return": "cancelled",
};

export async function pathaoCheckStatus(consignmentId: string): Promise<CourierStatusResult> {
  if (!pathaoConfigured()) return { ok: false, error: "Pathao API credentials not configured" };
  try {
    const token = await getToken();
    if (!token) return { ok: false, error: "Pathao: authentication failed" };
    const data = await authedGet(token, `/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`);
    const status = String(data?.data?.order_status ?? "");
    if (!status) return { ok: false, error: data?.message ?? "Pathao: status unavailable" };
    return { ok: true, status, normalized: TERMINAL_MAP[status.toLowerCase()] ?? null };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
