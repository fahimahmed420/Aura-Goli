// Lightweight GA4 + Meta Pixel event helpers. Every call is a no-op unless the
// corresponding script has loaded (i.e. NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_FB_PIXEL_ID
// are set), so these are always safe to call from client components.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

const CURRENCY = "BDT";

export interface AnalyticsItem {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

export function trackAddToCart(p: { id?: string; name?: string; price?: number; quantity?: number }) {
  if (typeof window === "undefined") return;
  const value = (p.price ?? 0) * (p.quantity ?? 1);
  window.gtag?.("event", "add_to_cart", {
    currency: CURRENCY, value,
    items: [{ item_id: p.id, item_name: p.name, price: p.price, quantity: p.quantity ?? 1 }],
  });
  window.fbq?.("track", "AddToCart", {
    content_ids: p.id ? [p.id] : [], content_name: p.name, value, currency: CURRENCY,
  });
}

export function trackPurchase(p: { orderId: string; value: number; items?: AnalyticsItem[] }) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "purchase", {
    transaction_id: p.orderId, currency: CURRENCY, value: p.value,
    items: p.items?.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
  });
  window.fbq?.("track", "Purchase", {
    value: p.value, currency: CURRENCY, content_ids: p.items?.map((i) => i.id).filter(Boolean) ?? [],
  });
}
