"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CartItem } from "../cart/CartClient";
import Spinner from "@/components/ui/Spinner";
import { ArrowRight } from "@/components/ui/Button";

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
  { id: "card", label: "Card", icon: "credit_card", sub: "Visa / Mastercard, via Stripe" },
  { id: "cod", label: "Cash on Delivery", icon: "payments", sub: "Pay when received" },
];

// All 64 districts of Bangladesh — offered as autocomplete for the City field
const BD_DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura", "Brahmanbaria", "Chandpur",
  "Chapainawabganj", "Chattogram", "Chuadanga", "Cox's Bazar", "Cumilla", "Dhaka", "Dinajpur",
  "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore",
  "Jhalokathi", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram",
  "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur",
  "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi",
  "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali",
  "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur",
  "Sherpur", "Sirajganj", "Sunamganj", "Sylhet", "Tangail", "Thakurgaon",
];

interface FlashSale { id: string; discountPercent: number; categorySlug: string | null; bannerText: string; }

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
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);

  const [shippingTouched, setShippingTouched] = useState(false);

  // Declared above the effect that calls it — reading a binding before its
  // declaration works for hoisted functions but trips the React compiler and
  // is a footgun if this is ever refactored into a const arrow.
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

  function setField(field: keyof ShippingForm, value: string) {
    setSelectedAddressId(null); // user is manually editing — deselect saved address
    setShipping((s) => ({ ...s, [field]: value }));
  }

  function selectAddress(a: SavedAddress) {
    setSelectedAddressId(a.id);
    applyAddress(a);
  }

  useEffect(() => {
    const raw = sessionStorage.getItem("checkoutState");
    if (!raw) { router.replace("/cart"); return; }
    setState(JSON.parse(raw));

    // Fetch active flash sale for auto-discount
    fetch("/api/flash-sale").then(r => r.ok ? r.json() : null).then(d => setFlashSale(d?.sale ?? null)).catch(() => {});

    // Pre-fill from auth token + load saved addresses
    const token = localStorage.getItem("ag_authed");
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

  function validateShipping() {
    return !!(shipping.name && shipping.phone && shipping.address && shipping.city && shipping.email);
  }

  function fieldError(field: keyof ShippingForm) {
    if (!shippingTouched) return false;
    return !shipping[field];
  }

  // Computed above placeOrder, which closes over it. `state` is still
  // possibly-null here (the early return happens further down), so guard.
  const flashDiscount = flashSale && state
    ? Math.round(state.cart.reduce((sum, item) => {
        const matches = !flashSale.categorySlug || item.categorySlug === flashSale.categorySlug;
        return matches ? sum + item.price * item.quantity * (flashSale.discountPercent / 100) : sum;
      }, 0))
    : 0;

  async function placeOrder() {
    if (!state) return;
    setPlacing(true);
    setError("");

    const token = localStorage.getItem("ag_authed");
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
        isGift: state.isGift,
        flashSaleId: flashSale?.id ?? null,
        flashDiscount,
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
    // Let the confirmation/tracking pages authenticate the guest's order lookup
    sessionStorage.setItem("ag_order_email", shipping.email);
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
  // Gift selection (and its per-item fee) is decided in the cart and carried here.
  const isGift = state.isGift;
  const giftFee = state.giftFee;
  const total = subtotal + shippingFee + giftFee - state.discount - flashDiscount;

  const steps = [
    { n: 1, label: "Shipping" },
    { n: 2, label: "Payment" },
    { n: 3, label: "Review" },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-12 py-6 min-h-screen bg-canvas">
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-10">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              step >= s.n ? "bg-accent text-accent-fg" : "bg-surface-raised text-fg-subtle"
            }`}>{s.n}</div>
            <span className={`hidden sm:inline text-xs font-medium uppercase tracking-widest ${step === s.n ? "text-fg" : "text-fg-subtle"}`}>{s.label}</span>
            {i < steps.length - 1 && <div className={`w-10 sm:w-16 h-0.5 ${step > s.n ? "bg-accent" : "bg-line-strong"}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Left — steps */}
        <div className="lg:col-span-3 space-y-6">

          {/* Step 1: Shipping */}
          {step === 1 && (
            <div className="bg-surface border border-line p-6 space-y-5" style={{ borderRadius: "var(--radius-card)" }}>
              <h2 className="dd-display text-2xl text-fg">Shipping Details</h2>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="dd-eyebrow text-fg-subtle">Saved Addresses</p>
                  <div className="grid gap-2">
                    {savedAddresses.map((a) => {
                      const selected = selectedAddressId === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => selectAddress(a)}
                          className={`text-left w-full flex items-start gap-3 p-3.5 rounded-lg border-2 transition-all ${
                            selected ? "border-accent bg-accent-tint" : "border-line"
                          }`}
                        >
                          {/* Radio indicator */}
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "border-accent" : "border-line-strong"}`}>
                            {selected && <div className="w-2 h-2 rounded-full bg-accent" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-fg">{a.fullName}</p>
                              {a.isDefault && (
                                <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-tint text-accent">Default</span>
                              )}
                            </div>
                            <p className="text-xs text-fg-subtle mt-0.5 truncate">
                              {[a.line1, a.line2, a.thana, a.district, a.city].filter(Boolean).join(", ")}
                            </p>
                            <p className="text-xs text-fg-subtle">{a.phone}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-line" />
                    <span className="text-[11px] font-medium text-fg-subtle uppercase tracking-wider">or enter a different address</span>
                    <div className="flex-1 h-px bg-line" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name" required error={fieldError("name") ? "Required" : undefined}>
                  <input value={shipping.name} onChange={(e) => setField("name", e.target.value)} className="field-input" placeholder="Your Name" style={fieldError("name") ? { borderColor: "var(--danger)" } : undefined} />
                </Field>
                <Field label="Phone" required error={fieldError("phone") ? "Required" : undefined}>
                  <input type="tel" value={shipping.phone} onChange={(e) => setField("phone", e.target.value)} className="field-input" placeholder="01XXXXXXXXX" style={fieldError("phone") ? { borderColor: "var(--danger)" } : undefined} />
                </Field>
                <Field label="Email" required error={fieldError("email") ? "Required" : undefined}>
                  <input type="email" value={shipping.email} onChange={(e) => setField("email", e.target.value)}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      // Capture a valid email onto the cart so an abandoned guest cart is recoverable.
                      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
                        fetch("/api/cart/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: v }) }).catch(() => {});
                      }
                    }}
                    className="field-input" placeholder="you@email.com" style={fieldError("email") ? { borderColor: "var(--danger)" } : undefined} />
                </Field>
                <Field label="City / District" required error={fieldError("city") ? "Required" : undefined}>
                  <input value={shipping.city} onChange={(e) => setField("city", e.target.value)} className="field-input" placeholder="Dhaka" list="bd-districts" style={fieldError("city") ? { borderColor: "var(--danger)" } : undefined} />
                  <datalist id="bd-districts">
                    {BD_DISTRICTS.map((d) => <option key={d} value={d} />)}
                  </datalist>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Address" required error={fieldError("address") ? "Required" : undefined}>
                    <input value={shipping.address} onChange={(e) => setField("address", e.target.value)} className="field-input" placeholder="House, Road, Area" style={fieldError("address") ? { borderColor: "var(--danger)" } : undefined} />
                  </Field>
                </div>
                <Field label="Postal Code">
                  <input value={shipping.postalCode} onChange={(e) => setField("postalCode", e.target.value)} className="field-input" placeholder="1212" />
                </Field>
              </div>

              {/* Gift selection is made in the cart; if chosen, show a read-only note here. */}
              {isGift && (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-accent/40 bg-accent-tint">
                  <span className="material-symbols-outlined text-2xl flex-shrink-0 text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg">Gift packaging added <span className="font-medium text-accent">+৳{giftFee}</span></p>
                    <p className="text-xs text-fg-subtle mt-0.5">Premium box &amp; ribbon wrap. Manage this in your <Link href="/cart" className="underline">cart</Link>.</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setShippingTouched(true);
                  if (validateShipping()) setStep(2);
                }}
                className="w-full py-4 font-medium text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover"
                style={{ borderRadius: "var(--radius-pill)" }}
              >
                Continue to Payment <ArrowRight />
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="bg-surface border border-line p-6 space-y-5" style={{ borderRadius: "var(--radius-card)" }}>
              <h2 className="dd-display text-2xl text-fg">Payment Method</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((pm) => (
                  <label
                    key={pm.id}
                    className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === pm.id ? "border-accent bg-accent-tint" : "border-line hover:border-line-strong"
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
                    <span className="material-symbols-outlined text-2xl text-fg-subtle">{pm.icon}</span>
                    <div>
                      <p className="font-medium text-sm text-fg">{pm.label}</p>
                      <p className="text-xs text-fg-subtle">{pm.sub}</p>
                    </div>
                    {paymentMethod === pm.id && (
                      <span className="material-symbols-outlined text-accent ml-auto">check_circle</span>
                    )}
                  </label>
                ))}
              </div>

              {paymentMethod === "card" && (
                <div className="rounded-lg px-4 py-3 space-y-1 bg-accent-tint border border-accent/30">
                  <p className="text-xs font-medium text-accent">Card payment</p>
                  <p className="text-xs text-fg-muted">
                    You&apos;ll be redirected to Stripe&apos;s secure payment page to enter your card details.
                    Your card number never touches our servers.
                  </p>
                  <p className="text-[11px] text-fg-subtle mt-1">Secured by Stripe · PCI DSS compliant</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-line-strong py-4 font-medium text-sm uppercase tracking-widest text-fg hover:bg-surface-raised transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">arrow_back</span> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] py-4 font-medium text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover"
                  style={{ borderRadius: "var(--radius-pill)" }}
                >
                  Review Order <ArrowRight />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Place Order */}
          {step === 3 && (
            <div className="bg-surface border border-line p-6 space-y-6" style={{ borderRadius: "var(--radius-card)" }}>
              <h2 className="dd-display text-2xl text-fg">Review Your Order</h2>

              {/* Shipping summary */}
              <div className="bg-surface-raised rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="dd-eyebrow text-fg-subtle">Shipping To</p>
                  <button onClick={() => setStep(1)} className="text-xs text-accent hover:underline font-medium">Change</button>
                </div>
                <p className="text-sm font-medium text-fg">{shipping.name}</p>
                <p className="text-sm text-fg-muted">{shipping.address}, {shipping.city} {shipping.postalCode}</p>
                <p className="text-sm text-fg-muted">{shipping.phone}</p>
              </div>

              {/* Payment summary */}
              <div className="bg-surface-raised rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="dd-eyebrow text-fg-subtle">Payment</p>
                  <button onClick={() => setStep(2)} className="text-xs text-accent hover:underline font-medium">Change</button>
                </div>
                <p className="text-sm font-medium text-fg capitalize">
                  {PAYMENT_METHODS.find((p) => p.id === paymentMethod)?.label}
                </p>
              </div>

              {/* Gift packaging notice */}
              {isGift && (
                <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-accent bg-accent-tint">
                  <span className="material-symbols-outlined text-accent text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
                  <div>
                    <p className="text-sm font-medium text-accent">Gift Packaging Included</p>
                    <p className="text-xs text-fg-muted">Premium box &amp; ribbon wrap · +৳{giftFee}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3">
                {state.cart.map((item) => (
                  <div key={item.variantId} className="flex gap-3 items-center">
                    <div className="w-12 h-16 bg-surface-raised relative overflow-hidden rounded flex-shrink-0">
                      {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{item.name}</p>
                      <p className="text-xs text-fg-subtle">
                        {[item.color, item.size].filter(Boolean).join(" / ")} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-fg flex-shrink-0">৳{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="px-4 py-3 text-sm flex items-center gap-2 rounded-lg" style={{ background: "var(--danger-tint)", border: "1px solid var(--danger)", color: "var(--danger)" }}>
                  <span className="material-symbols-outlined text-base">error</span>{error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border border-line-strong py-4 font-medium text-sm uppercase tracking-widest text-fg hover:bg-surface-raised transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">arrow_back</span> Back
                </button>
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="flex-[2] py-4 font-medium text-sm uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover"
                  style={{ borderRadius: "var(--radius-pill)" }}
                >
                  {placing ? (
                    <><Spinner size={16} /> Processing…</>
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
          <div className="bg-surface border border-line p-6 sticky top-24 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
            <h3 className="dd-display text-xl text-fg">Order Summary</h3>

            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {state.cart.map((item) => (
                <div key={item.variantId} className="flex gap-3 items-center">
                  <div className="w-10 h-12 bg-surface-raised relative overflow-hidden rounded flex-shrink-0">
                    {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-fg truncate">{item.name}</p>
                    <p className="text-xs text-fg-subtle">×{item.quantity}</p>
                  </div>
                  <p className="text-xs font-medium text-fg">৳{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm border-t border-line pt-4">
              <div className="flex justify-between text-fg-muted"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-fg-muted">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? <span className="font-medium" style={{ color: "var(--success)" }}>Free</span> : `৳${shippingFee}`}</span>
              </div>
              {giftFee > 0 && (
                <div className="flex justify-between text-accent">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>card_giftcard</span>
                    Gift packaging
                  </span>
                  <span>+৳{giftFee}</span>
                </div>
              )}
              {state.discount > 0 && (
                <div className="flex justify-between font-medium" style={{ color: "var(--success)" }}>
                  <span>Promo discount</span><span>-৳{state.discount.toLocaleString()}</span>
                </div>
              )}
              {flashDiscount > 0 && (
                <div className="flex justify-between font-medium text-accent">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">bolt</span>
                    Flash Sale ({flashSale!.discountPercent}% off{flashSale!.categorySlug ? ` · ${flashSale!.categorySlug}` : ""})
                  </span>
                  <span>-৳{flashDiscount.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between font-medium text-fg text-lg border-t border-line pt-4">
              <span>Total</span><span>৳{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-widest text-fg-muted">
        {label}{required && <span className="ml-0.5" style={{ color: "var(--danger)" }}>*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] font-medium" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
