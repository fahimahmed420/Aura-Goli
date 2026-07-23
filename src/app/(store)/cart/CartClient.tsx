"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Spinner from "@/components/ui/Spinner";

export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  color: string | null;
  size: string | null;
  image: string | null;
  quantity: number;
  sku?: string;
  categorySlug?: string | null;
}

function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("cart") ?? "[]"); } catch { return []; }
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem("cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-updated"));
}

export default function CartClient() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const GIFT_FEE = 50;

  useEffect(() => { setCart(getCart()); }, []);

  function updateQty(variantId: string, delta: number) {
    const updated = cart.map((i) =>
      i.variantId === variantId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    );
    setCart(updated);
    saveCart(updated);
  }

  function remove(variantId: string) {
    const updated = cart.filter((i) => i.variantId !== variantId);
    setCart(updated);
    saveCart(updated);
  }

  async function applyPromo() {
    setPromoError("");
    if (!promoCode.trim() || applyingPromo) return;
    setApplyingPromo(true);
    try {
      const res = await fetch("/api/checkout/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error ?? "Invalid code"); return; }
      setPromoApplied({ code: data.code, discount: data.discountAmount });
    } finally {
      setApplyingPromo(false);
    }
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
  const shippingFee = subtotal >= 2000 ? 0 : 100;
  const discount = promoApplied?.discount ?? 0;
  const giftFee = isGift ? GIFT_FEE * totalQty : 0; // ৳50 per item
  const total = subtotal + shippingFee + giftFee - discount;

  if (cart.length === 0) {
    return (
      <div className="bg-canvas min-h-screen">
        <EmptyState
          icon="shopping_bag"
          title="Your bag is empty"
          body="Looks like you haven't added anything yet."
          action={{ href: "/shop", label: "Start shopping" }}
        />
      </div>
    );
  }

  return (
    <div className="bg-canvas min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 md:px-12 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="dd-display text-4xl text-fg">Your Cart</h1>
          <p className="text-fg-subtle text-sm mt-1">{totalQty} {totalQty === 1 ? "item" : "items"}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-10 bg-surface-raised h-1 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: "33%" }} />
        </div>
        <div className="flex gap-2 text-xs uppercase tracking-widest font-medium mb-10">
          <span className="text-fg">1. Cart</span>
          <span className="text-fg-subtle">→ 2. Checkout</span>
          <span className="text-fg-subtle">→ 3. Confirmed</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div key={item.variantId} className="flex gap-5 bg-surface border border-line p-5" style={{ borderRadius: "var(--radius-card)" }}>
                <Link href={`/products/${item.productId}`} className="flex-shrink-0">
                  <div className="w-24 h-32 bg-surface-raised relative overflow-hidden rounded">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-fg-subtle">checkroom</span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link href={`/products/${item.productId}`} className="font-medium text-fg hover:text-accent transition-colors line-clamp-2">
                      {item.name}
                    </Link>
                    <div className="flex gap-3 mt-1 text-xs text-fg-subtle">
                      {item.color && <span>Color: {item.color}</span>}
                      {item.size && <span>Size: {item.size}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    {/* Qty stepper */}
                    <div className="flex items-center border border-line">
                      <button onClick={() => updateQty(item.variantId, -1)} className="w-11 h-11 flex items-center justify-center hover:bg-surface-raised transition-colors text-fg">
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="w-10 h-11 flex items-center justify-center text-sm font-medium border-x border-line text-fg">{item.quantity}</span>
                      <button onClick={() => updateQty(item.variantId, 1)} className="w-11 h-11 flex items-center justify-center hover:bg-surface-raised transition-colors text-fg">
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>

                    <p className="font-medium text-fg">৳{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                </div>

                <button onClick={() => remove(item.variantId)} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-fg-subtle hover:text-[var(--danger)] hover:bg-[var(--danger-tint)] transition-colors self-start">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-surface border border-line p-6 sticky top-24 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
              <h2 className="dd-display text-xl text-fg">Order Summary</h2>

              <div className="space-y-3 text-sm border-b border-line pb-4">
                <div className="flex justify-between text-fg-muted">
                  <span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-fg-muted">
                  <span>Shipping</span>
                  <span>{shippingFee === 0 ? <span className="font-medium" style={{ color: "var(--success)" }}>Free</span> : `৳${shippingFee}`}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between font-medium" style={{ color: "var(--success)" }}>
                    <span>Discount ({promoApplied?.code})</span><span>-৳{discount.toLocaleString()}</span>
                  </div>
                )}
                {isGift && (
                  <div className="flex justify-between text-accent font-medium">
                    <span>Gift packaging ({totalQty} × ৳{GIFT_FEE})</span><span>+৳{giftFee}</span>
                  </div>
                )}
                {shippingFee > 0 && (
                  <p className="text-xs text-accent">Add ৳{(2000 - subtotal).toLocaleString()} more for free shipping</p>
                )}
              </div>

              <div className="flex justify-between font-medium text-fg text-lg">
                <span>Total</span><span>৳{total.toLocaleString()}</span>
              </div>

              {/* Gift packaging toggle */}
              <button
                onClick={() => setIsGift((v) => !v)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  isGift ? "border-accent bg-accent-tint" : "border-line hover:border-line-strong"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isGift ? "bg-accent" : "bg-surface-raised"
                }`}>
                  <span className="material-symbols-outlined text-xl" style={{ color: isGift ? "var(--accent-fg)" : "var(--fg-subtle)", fontVariationSettings: isGift ? "'FILL' 1" : "'FILL' 0" }}>
                    card_giftcard
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-fg">Buy as Gift <span className="text-accent">+৳{GIFT_FEE}/item</span></p>
                  <p className="text-xs text-fg-subtle mt-0.5">Premium box packaging &amp; ribbon wrap{isGift ? ` · ${totalQty} item${totalQty !== 1 ? "s" : ""} = ৳${giftFee}` : ""}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isGift ? "border-accent bg-accent" : "border-line-strong"
                }`}>
                  {isGift && <span className="material-symbols-outlined text-[12px] text-accent-fg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                </div>
              </button>

              {/* Promo */}
              <div className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    disabled={!!promoApplied}
                    className="field-input flex-1 text-sm disabled:opacity-50"
                    placeholder="PROMO CODE"
                  />
                  <button
                    onClick={applyPromo}
                    disabled={!!promoApplied || applyingPromo}
                    className="px-4 py-2 border border-line-strong text-sm font-medium uppercase tracking-wider text-fg hover:bg-surface-raised transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {applyingPromo ? <><Spinner size={14} />Checking</> : "Apply"}
                  </button>
                </div>
                {promoError && <p className="text-xs" style={{ color: "var(--danger)" }}>{promoError}</p>}
                {promoApplied && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium" style={{ color: "var(--success)" }}>✓ ৳{promoApplied.discount.toLocaleString()} discount applied</p>
                    <button onClick={() => { setPromoApplied(null); setPromoCode(""); }} className="text-xs text-fg-subtle hover:text-fg">Remove</button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  const state = { cart, total, discount, promoCode: promoApplied?.code ?? null, isGift, giftFee };
                  sessionStorage.setItem("checkoutState", JSON.stringify(state));
                  router.push("/checkout");
                }}
                className="group w-full py-4 font-medium text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover"
                style={{ borderRadius: "var(--radius-pill)" }}
              >
                Proceed to Checkout
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 pt-2 text-fg-subtle opacity-70">
                <span className="text-xs font-medium tracking-wider">VISA</span>
                <span className="text-xs font-medium tracking-wider">Mastercard</span>
                <span className="text-xs font-medium tracking-wider">Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
