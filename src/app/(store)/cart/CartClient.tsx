"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const shippingFee = subtotal >= 2000 ? 0 : 100;
  const discount = promoApplied?.discount ?? 0;
  const giftFee = isGift ? GIFT_FEE : 0;
  const total = subtotal + shippingFee + giftFee - discount;

  if (cart.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-12 py-20 text-center">
        <span className="material-symbols-outlined text-6xl text-[#e8e8e8] mb-6 block">shopping_bag</span>
        <h1 className="font-['Playfair_Display'] text-3xl font-bold text-black mb-3">Your bag is empty</h1>
        <p className="text-[#747878] mb-8">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/shop" className="inline-flex items-center gap-2 bg-black text-white px-10 py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#5951b4] transition-colors">
          Start Shopping <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-12 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-['Playfair_Display'] text-4xl font-bold text-black">Your Cart</h1>
        <p className="text-[#747878] text-sm mt-1">{cart.reduce((s, i) => s + i.quantity, 0)} items</p>
      </div>

      {/* Progress bar */}
      <div className="mb-10 bg-[#e2e2e2] h-1 rounded-full overflow-hidden">
        <div className="h-full bg-black rounded-full transition-all duration-700" style={{ width: "33%" }} />
      </div>
      <div className="flex gap-2 text-xs uppercase tracking-widest font-semibold mb-10">
        <span className="text-black">1. Cart</span>
        <span className="text-[#e8e8e8]">→ 2. Checkout</span>
        <span className="text-[#e8e8e8]">→ 3. Confirmed</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div key={item.variantId} className="flex gap-5 bg-white border border-[#e8e8e8] p-5 rounded-lg high-fashion-shadow">
              <Link href={`/products/${item.productId}`} className="flex-shrink-0">
                <div className="w-24 h-32 bg-[#e2e2e2] relative overflow-hidden rounded">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-[#e8e8e8]">checkroom</span>
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <Link href={`/products/${item.productId}`} className="font-semibold text-black hover:text-[#5951b4] transition-colors line-clamp-2">
                    {item.name}
                  </Link>
                  <div className="flex gap-3 mt-1 text-xs text-[#747878]">
                    {item.color && <span>Color: {item.color}</span>}
                    {item.size && <span>Size: {item.size}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  {/* Qty stepper */}
                  <div className="flex items-center border border-[#e8e8e8]">
                    <button onClick={() => updateQty(item.variantId, -1)} className="w-11 h-11 flex items-center justify-center hover:bg-[#f4f3f3] transition-colors">
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <span className="w-10 h-11 flex items-center justify-center text-sm font-semibold border-x border-[#e8e8e8]">{item.quantity}</span>
                    <button onClick={() => updateQty(item.variantId, 1)} className="w-11 h-11 flex items-center justify-center hover:bg-[#f4f3f3] transition-colors">
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>

                  <p className="font-bold text-black">৳{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              </div>

              <button onClick={() => remove(item.variantId)} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-[#747878] hover:text-[#ba1a1a] hover:bg-red-50 transition-colors self-start">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-[#e8e8e8] rounded-lg p-6 high-fashion-shadow sticky top-24 space-y-4">
            <h2 className="font-['Playfair_Display'] text-xl font-bold text-black">Order Summary</h2>

            <div className="space-y-3 text-sm border-b border-[#e8e8e8] pb-4">
              <div className="flex justify-between text-[#444748]">
                <span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#444748]">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? <span className="text-green-600 font-semibold">Free</span> : `৳${shippingFee}`}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Discount ({promoApplied?.code})</span><span>-৳{discount.toLocaleString()}</span>
                </div>
              )}
              {isGift && (
                <div className="flex justify-between text-[#5951b4] font-semibold">
                  <span>Gift packaging</span><span>+৳{GIFT_FEE}</span>
                </div>
              )}
              {shippingFee > 0 && (
                <p className="text-xs text-[#5951b4]">Add ৳{(2000 - subtotal).toLocaleString()} more for free shipping</p>
              )}
            </div>

            <div className="flex justify-between font-bold text-black text-lg">
              <span>Total</span><span>৳{total.toLocaleString()}</span>
            </div>

            {/* Gift packaging toggle */}
            <button
              onClick={() => setIsGift((v) => !v)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                isGift ? "border-[#5951b4] bg-[#f0eeff]" : "border-[#e8e8e8] hover:border-[#c4c7c7]"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                isGift ? "bg-[#5951b4]" : "bg-[#f4f3f3]"
              }`}>
                <span className="material-symbols-outlined text-xl" style={{ color: isGift ? "white" : "#747878", fontVariationSettings: isGift ? "'FILL' 1" : "'FILL' 0" }}>
                  card_giftcard
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-black">Buy as Gift <span className="text-[#5951b4]">+৳{GIFT_FEE}</span></p>
                <p className="text-xs text-[#747878] mt-0.5">Premium box packaging &amp; ribbon wrap</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isGift ? "border-[#5951b4] bg-[#5951b4]" : "border-[#c4c7c7]"
              }`}>
                {isGift && <span className="material-symbols-outlined text-[12px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
              </div>
            </button>

            {/* Promo */}
            <div className="space-y-2 pt-2">
              <div className="flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={!!promoApplied}
                  className="flex-1 border border-[#e8e8e8] px-3 py-2 text-sm outline-none focus:border-black disabled:bg-[#f4f3f3] disabled:text-[#747878]"
                  placeholder="PROMO CODE"
                />
                <button
                  onClick={applyPromo}
                  disabled={!!promoApplied || applyingPromo}
                  className="px-4 py-2 border border-black text-sm font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {applyingPromo
                    ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Checking</>
                    : "Apply"}
                </button>
              </div>
              {promoError && <p className="text-xs text-[#ba1a1a]">{promoError}</p>}
              {promoApplied && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-green-600 font-semibold">✓ ৳{promoApplied.discount.toLocaleString()} discount applied</p>
                  <button onClick={() => { setPromoApplied(null); setPromoCode(""); }} className="text-xs text-[#747878] hover:text-black">Remove</button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const state = { cart, total, discount, promoCode: promoApplied?.code ?? null, isGift, giftFee };
                sessionStorage.setItem("checkoutState", JSON.stringify(state));
                router.push("/checkout");
              }}
              className="group w-full bg-black text-white py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#5951b4] transition-colors flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 pt-2 opacity-50">
              <span className="text-xs font-bold tracking-wider">VISA</span>
              <span className="text-xs font-bold tracking-wider">bKash</span>
              <span className="text-xs font-bold tracking-wider">Nagad</span>
              <span className="text-xs font-bold tracking-wider">SSL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
