"use client";

/**
 * CartSync — keeps the localStorage cart (the working copy used by the cart page,
 * product page, and checkout) mirrored to the server so it survives across devices
 * and powers abandoned-cart recovery.
 *
 * - On load / login: pull the server cart and union it with the local cart.
 * - On any cart change: debounce-push the local cart to the server.
 *
 * localStorage stays the source of truth for the UI, so checkout is untouched.
 */

import { useEffect, useRef } from "react";

interface LocalItem { variantId: string; quantity: number; [k: string]: unknown; }

function readLocal(): LocalItem[] {
  try {
    const c = JSON.parse(localStorage.getItem("cart") ?? "[]");
    return Array.isArray(c) ? c : [];
  } catch { return []; }
}

function sameCart(a: LocalItem[], b: LocalItem[]) {
  const norm = (x: LocalItem[]) => x.map((i) => `${i.variantId}:${i.quantity}`).sort().join("|");
  return norm(a) === norm(b);
}

function unionMax(local: LocalItem[], server: LocalItem[]): LocalItem[] {
  const map = new Map<string, LocalItem>();
  for (const it of server) if (it?.variantId) map.set(it.variantId, { ...it });
  for (const it of local) {
    if (!it?.variantId) continue;
    const ex = map.get(it.variantId);
    map.set(it.variantId, ex
      ? { ...ex, ...it, quantity: Math.max(Number(ex.quantity) || 1, Number(it.quantity) || 1) }
      : { ...it });
  }
  return [...map.values()];
}

export default function CartSync() {
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    function pushToServer() {
      const items = readLocal().map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
      fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }).catch(() => { /* offline — retried on next change */ });
    }

    async function syncFromServer() {
      try {
        const r = await fetch("/api/cart", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const server: LocalItem[] = Array.isArray(d.items) ? d.items : [];
        const local = readLocal();
        const merged = local.length ? unionMax(local, server) : server;
        if (cancelled) return;
        if (!sameCart(merged, local)) {
          localStorage.setItem("cart", JSON.stringify(merged));
          window.dispatchEvent(new Event("cart-updated")); // refresh UI + triggers push
        } else {
          pushToServer(); // local already current — ensure the mirror matches
        }
      } catch { /* offline — keep local cart */ }
    }

    function onCartUpdated() {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(pushToServer, 800);
    }

    syncFromServer();
    window.addEventListener("cart-updated", onCartUpdated);
    window.addEventListener("user-updated", syncFromServer);
    return () => {
      cancelled = true;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      window.removeEventListener("cart-updated", onCartUpdated);
      window.removeEventListener("user-updated", syncFromServer);
    };
  }, []);

  return null;
}
