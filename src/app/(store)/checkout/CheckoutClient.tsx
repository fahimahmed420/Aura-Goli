"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CartItem } from "../cart/CartClient";

type Step = 1 | 2 | 3;

interface ShippingForm {
  name: string; phone: string; email: string;
  address: string; city: string; postalCode: string;
}

interface SavedAddress {
  id: string; fullName: string; phone: string;
  line1: string; line2?: string | null;
  district: string; thana?: string; city: string;
  postalCode: string; isDefault: boolean;
}

interface CheckoutState {
  cart: CartItem[];
  total: number;
  discount: number;
  promoCode: string | null;
  isGift: boolean;
  giftFee: number;
}

const PAYMENT_METHODS = [
  { id: "card", label: "Credit / Debit Card", icon: "credit_card", sub: "Visa, Mastercard" },
  { id: "bkash", label: "bKash", icon: "phone_android", sub: "Mobile banking" },
  { id: "nagad", label: "Nagad", icon: "phone_android", sub: "Mobile banking" },
  { id: "cod", label: "Cash on Delivery", icon: "payments", sub: "Pay when received" },
];

const GIFT_FEE = 50;

export default function CheckoutClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<CheckoutState | null>(null);
  const [shipping, setShipping] = useState<ShippingForm>({ name: "", phone: "", email: "", address: "", city: "", postalCode: "" });
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isGift, setIsGift] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("checkoutState");
    if (!raw) { router.replace("/cart"); return; }
    setState(JSON.parse(raw));

    // Pre-fill from auth token + load saved addresses
    const token = localStorage.getItem("userToken");
    if (token) {
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.user) setShipping((s) => ({ ...s, name: d.user.name ?? "", email: d.user.email ?? "" }));
        })
        .catch(() => {});

      fetch("/api/account/addresses", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : { addresses: [] })
        .then((d) => {
          const addrs: SavedAddress[] = d.addresses ?? [];
          setSavedAddresses(addrs);
          // Auto-select default address and fill form
          const def = addrs.find((a) => a.isDefault) ?? addrs[0];
          if (def) {
            setSelectedAddressId(def.id);
            applyAddress(def);
          }
        })
        .catch(() => {});
    }
  }, [router]);

  function setField(field: keyof ShippingForm, value: string) {
    setSelectedAddressId(null); // user is manually editing — deselect saved address
    setShipping((s) => ({ ...s, [field]: value }));
  }

  function applyAddress(a: SavedAddress) {
    setShipping((s) => ({
      ...s,
      name: a.fullName,
      phone: a.phone,
      address: [a.line1, a.line2, a.thana, a.district].filter(Boolean).join(", "),
      city: a.city,
      postalCode: a.postalCode,
    }));
  }

  function selectAddress(a: SavedAddress) {
    setSelectedAddressId(a.id);
    applyAddress(a);
  }

  function validateShipping() {
    return shipping.name && shipping.phone && shipping.address && shipping.city && shipping.email;
  }

  async function placeOrder() {
    if (!state) return;
    setPlacing(true);
    setError("");

    const token = localStorage.getItem("userToken");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch("/api/checkout/create-order", {
      method: "POST",
      headers,
      body: JSON.stringify({
        shippingAddress: shipping,
        items: state.cart.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        promoCode: state.promoCode,
        paymentMethod,
        guestEmail: shipping.email,
        isGift,
        giftFee: isGift ? GIFT_FEE : 0,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Order failed. Please try again.");
      setPlacing(false);
      return;
    }

    // Clear cart
    localStorage.removeItem("cart");
    sessionStorage.removeItem("checkoutState");
    window.dispatchEvent(new Event("cart-updated"));

    // Redirect — either to SSLCommerz or order confirmed
    if (data.redirectUrl.startsWith("http")) {
      window.location.href = data.redirectUrl;
    } else {
      router.push(data.redirectUrl);
    }
  }

  if (!state) return null;

  const subtotal = state.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = subtotal >= 2000 ? 0 : 100;
  const giftFee = isGift ? GIFT_FEE : 0;
  const total = subtotal + shippingFee + giftFee - state.discount;

  const steps = [
    { n: 1, label: "Shipping" },
    { n: 2, label: "Payment" },
    { n: 3, label: "Review" },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-12 py-10">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-4 mb-10">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s.n ? "bg-black text-white" : "bg-[#e2e2e2] text-[#747878]"
              }`}>{s.n}</div>
              <span className={`text-xs font-semibold uppercase tracking-widest ${step === s.n ? "text-black" : "text-[#747878]"}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`w-16 h-0.5 mb-5 ${step > s.n ? "bg-black" : "bg-[#e2e2e2]"}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Left — steps */}
        <div className="lg:col-span-3 space-y-6">

          {/* Step 1: Shipping */}
          {step === 1 && (
            <div className="bg-white border border-[#c4c7c7] rounded-lg p-6 space-y-5">
              <h2 className="font-['Playfair_Display'] text-2xl font-bold text-black">Shipping Details</h2>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#444748]">Saved Addresses</p>
                  <div className="grid gap-2">
                    {savedAddresses.map((a) => {
                      const selected = selectedAddressId === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => selectAddress(a)}
                          className="text-left w-full flex items-start gap-3 p-3.5 rounded-lg border-2 transition-all"
                          style={{
                            borderColor: selected ? "#12103a" : "#e8e8e8",
                            background: selected ? "#f4f3f3" : "#fff",
                          }}
                        >
                          {/* Radio indicator */}
                          <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                            style={{ borderColor: selected ? "#12103a" : "#c4c7c7" }}>
                            {selected && <div className="w-2 h-2 rounded-full" style={{ background: "#12103a" }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-black">{a.fullName}</p>
                              {a.isDefault && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                  style={{ background: "rgba(18,16,58,0.08)", color: "#12103a" }}>Default</span>
                              )}
                            </div>
                            <p className="text-xs text-[#747878] mt-0.5 truncate">
                              {[a.line1, a.line2, a.thana, a.district, a.city].filter(Boolean).join(", ")}
                            </p>
                            <p className="text-xs text-[#747878]">{a.phone}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-[#e8e8e8]" />
                    <span className="text-[11px] font-semibold text-[#c4c7c7] uppercase tracking-wider">or enter a different address</span>
                    <div className="flex-1 h-px bg-[#e8e8e8]" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name" required>
                  <input value={shipping.name} onChange={(e) => setField("name", e.target.value)} className="field-input" placeholder="Faisal Ahmed" required />
                </Field>
                <Field label="Phone" required>
                  <input type="tel" value={shipping.phone} onChange={(e) => setField("phone", e.target.value)} className="field-input" placeholder="01XXXXXXXXX" required />
                </Field>
                <Field label="Email" required>
                  <input type="email" value={shipping.email} onChange={(e) => setField("email", e.target.value)} className="field-input" placeholder="you@email.com" required />
                </Field>
                <Field label="City" required>
                  <input value={shipping.city} onChange={(e) => setField("city", e.target.value)} className="field-input" placeholder="Dhaka" required />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Address" required>
                    <input value={shipping.address} onChange={(e) => setField("address", e.target.value)} className="field-input" placeholder="House, Road, Area" required />
                  </Field>
                </div>
                <Field label="Postal Code">
                  <input value={shipping.postalCode} onChange={(e) => setField("postalCode", e.target.value)} className="field-input" placeholder="1212" />
                </Field>
              </div>

              {/* Gift Wrapping Toggle */}
              <div
                className="flex items-center gap-4 p-4 rounded-lg border transition-all"
                style={{
                  background: isGift ? "#faf7f0" : "#fff",
                  borderColor: isGift ? "#c9a84c" : "#e2e2e2",
                }}
              >
                <span
                  className="material-symbols-outlined text-2xl flex-shrink-0"
                  style={{
                    fontVariationSettings: "'FILL' 1",
                    color: isGift ? "#c9a84c" : "#747878",
                  }}
                >
                  card_giftcard
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#0b0b14]">Gift Wrapping</p>
                    <span className="text-sm font-semibold" style={{ color: "#c9a84c" }}>+৳{GIFT_FEE}</span>
                  </div>
                  <p className="text-xs text-[#747878] mt-0.5">We&apos;ll wrap it beautifully and include a gift note card</p>
                </div>
                {/* Pill toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isGift}
                  onClick={() => setIsGift((v) => !v)}
                  className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2"
                  style={{ background: isGift ? "#c9a84c" : "#c4c7c7" }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: isGift ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              <button
                onClick={() => { if (validateShipping()) setStep(2); }}
                disabled={!validateShipping()}
                className="w-full bg-black text-white py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#5951b4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue to Payment <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="bg-white border border-[#c4c7c7] rounded-lg p-6 space-y-5">
              <h2 className="font-['Playfair_Display'] text-2xl font-bold text-black">Payment Method</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((pm) => (
                  <label
                    key={pm.id}
                    className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === pm.id ? "border-black bg-[#f4f3f3]" : "border-[#c4c7c7] hover:border-[#747878]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={pm.id}
                      checked={paymentMethod === pm.id}
                      onChange={() => setPaymentMethod(pm.id)}
                      className="sr-only"
                    />
                    <span className="material-symbols-outlined text-2xl text-[#5951b4]">{pm.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-black">{pm.label}</p>
                      <p className="text-xs text-[#747878]">{pm.sub}</p>
                    </div>
                    {paymentMethod === pm.id && (
                      <span className="material-symbols-outlined text-black ml-auto">check_circle</span>
                    )}
                  </label>
                ))}
              </div>

              {paymentMethod !== "cod" && (
                <p className="text-xs text-[#747878] bg-[#f4f3f3] px-4 py-3 rounded">
                  <span className="font-semibold">Secure payment via SSLCommerz.</span> You will be redirected to complete payment after review.
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-[#c4c7c7] py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#f4f3f3] transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">arrow_back</span> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] bg-black text-white py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#5951b4] transition-colors flex items-center justify-center gap-2"
                >
                  Review Order <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Place Order */}
          {step === 3 && (
            <div className="bg-white border border-[#c4c7c7] rounded-lg p-6 space-y-6">
              <h2 className="font-['Playfair_Display'] text-2xl font-bold text-black">Review Your Order</h2>

              {/* Shipping summary */}
              <div className="bg-[#f4f3f3] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#444748]">Shipping To</p>
                  <button onClick={() => setStep(1)} className="text-xs text-[#5951b4] hover:underline font-semibold">Change</button>
                </div>
                <p className="text-sm font-semibold text-black">{shipping.name}</p>
                <p className="text-sm text-[#444748]">{shipping.address}, {shipping.city} {shipping.postalCode}</p>
                <p className="text-sm text-[#444748]">{shipping.phone}</p>
              </div>

              {/* Payment summary */}
              <div className="bg-[#f4f3f3] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#444748]">Payment</p>
                  <button onClick={() => setStep(2)} className="text-xs text-[#5951b4] hover:underline font-semibold">Change</button>
                </div>
                <p className="text-sm font-semibold text-black capitalize">
                  {PAYMENT_METHODS.find((p) => p.id === paymentMethod)?.label}
                </p>
              </div>

              {/* Gift packaging notice */}
              {isGift && (
                <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-[#5951b4] bg-[#f0eeff]">
                  <span className="material-symbols-outlined text-[#5951b4] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
                  <div>
                    <p className="text-sm font-bold text-[#5951b4]">Gift Packaging Included</p>
                    <p className="text-xs text-[#444748]">Premium box &amp; ribbon wrap · +৳{giftFee}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3">
                {state.cart.map((item) => (
                  <div key={item.variantId} className="flex gap-3 items-center">
                    <div className="w-12 h-16 bg-[#e2e2e2] relative overflow-hidden rounded flex-shrink-0">
                      {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-black truncate">{item.name}</p>
                      <p className="text-xs text-[#747878]">
                        {[item.color, item.size].filter(Boolean).join(" / ")} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-black flex-shrink-0">৳{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 px-4 py-3 text-sm text-[#93000a] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>{error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border border-[#c4c7c7] py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#f4f3f3] transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">arrow_back</span> Back
                </button>
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="flex-[2] bg-black text-white py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#5951b4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {placing ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                  ) : (
                    <>Place Order — ৳{total.toLocaleString()} <span className="material-symbols-outlined text-lg">lock</span></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right — order summary */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#c4c7c7] rounded-lg p-6 sticky top-24 space-y-4">
            <h3 className="font-['Playfair_Display'] text-xl font-bold text-black">Order Summary</h3>

            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {state.cart.map((item) => (
                <div key={item.variantId} className="flex gap-3 items-center">
                  <div className="w-10 h-12 bg-[#e2e2e2] relative overflow-hidden rounded flex-shrink-0">
                    {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-black truncate">{item.name}</p>
                    <p className="text-xs text-[#747878]">×{item.quantity}</p>
                  </div>
                  <p className="text-xs font-bold text-black">৳{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm border-t border-[#c4c7c7] pt-4">
              <div className="flex justify-between text-[#444748]"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-[#444748]">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? <span className="text-green-600 font-semibold">Free</span> : `৳${shippingFee}`}</span>
              </div>
              {giftFee > 0 && (
                <div className="flex justify-between text-[#5951b4]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
                    Gift packaging
                  </span>
                  <span>+৳{giftFee}</span>
                </div>
              )}
              {state.discount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Discount</span><span>-৳{state.discount.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between font-bold text-black text-lg border-t border-[#c4c7c7] pt-4">
              <span>Total</span><span>৳{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-widest text-[#1a1c1c]">
        {label}{required && <span className="text-[#ba1a1a] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
