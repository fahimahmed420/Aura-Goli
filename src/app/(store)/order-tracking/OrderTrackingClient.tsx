"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_STEPS = [
  { key: "pending_payment", label: "Placed", icon: "receipt_long" },
  { key: "confirmed", label: "Confirmed", icon: "check_circle" },
  { key: "packed", label: "Packed", icon: "inventory_2" },
  { key: "shipped", label: "Shipped", icon: "local_shipping" },
  { key: "delivered", label: "Delivered", icon: "home" },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

interface OrderData {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  createdAt: string;
  trackingNumber: string | null;
  courierName: string | null;
  shippingAddress: { name: string; address: string; city: string; postalCode: string } | null;
  items: { productNameSnapshot: string; quantity: number; unitPrice: number }[];
  statusHistory: { status: string; note: string | null; createdAt: string }[];
}

function getStepIndex(status: string) {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

function estimatedDelivery(createdAt: string) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default function OrderTrackingClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const [orderInput, setOrderInput] = useState(sp.get("order") ?? "");
  const [emailInput, setEmailInput] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // Auto-fetch if order number is in URL (from order-confirmed page). Guests get
  // their checkout email from sessionStorage, set when the order was placed.
  useEffect(() => {
    const preloaded = sp.get("order");
    if (preloaded) {
      fetchOrder(preloaded, sessionStorage.getItem("ag_order_email"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchOrder(num: string, email: string | null) {
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const emailParam = email?.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
      const res = await fetch(`/api/orders/by-number/${encodeURIComponent(num.trim().toUpperCase())}${emailParam}`);
      if (!res.ok) {
        setOrder(null);
        const data = await res.json().catch(() => null);
        setError(
          res.status === 403
            ? (data?.error ?? "Please enter the email used for this order.")
            : "No order found with that number. Please check and try again.",
        );
        return;
      }
      const data = await res.json();
      setOrder(data.order);
      router.replace(`/order-tracking?order=${data.order.orderNumber}`, { scroll: false });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchOrder(orderInput, emailInput || null);
  }

  const activeStep = order ? getStepIndex(order.status) : -1;
  const isCancelled = order?.status === "cancelled";
  const progressPct = isCancelled ? 0 : order ? Math.round((activeStep / (STATUS_STEPS.length - 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Header */}
      <section className="px-4 md:px-12 pt-16 pb-10 max-w-6xl mx-auto text-center">
        <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-black mb-4">Track Your Order</h1>
        <p className="text-[#444748] text-lg max-w-xl mx-auto">
          Experience the journey of your curated pieces from our studio to your doorstep.
        </p>
      </section>

      {/* Lookup form */}
      {!order && (
        <section className="px-4 md:px-12 pb-16 max-w-xl mx-auto">
          <div className="bg-white border border-[#c4c7c7] rounded-xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#444748] uppercase tracking-widest mb-2">Order Number</label>
                <input
                  value={orderInput}
                  onChange={(e) => setOrderInput(e.target.value)}
                  className="w-full border border-[#c4c7c7] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#5951b4] focus:border-[#5951b4] transition-all"
                  placeholder="e.g. AG82931ABCD"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#444748] uppercase tracking-widest mb-2">Email Address <span className="font-normal text-[#747878] normal-case">(the one used at checkout)</span></label>
                <input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  type="email"
                  className="w-full border border-[#c4c7c7] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#5951b4] focus:border-[#5951b4] transition-all"
                  placeholder="email@example.com"
                />
              </div>
              {error && <p className="text-[#ba1a1a] text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#5951b4] transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? "Searching…" : "Track Shipment"}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Loading spinner (auto-fetch) */}
      {loading && !searched && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Tracking result */}
      {order && (
        <section className="px-4 md:px-12 pb-20 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left — main status */}
            <div className="lg:col-span-2 space-y-6">

              {/* ETA / status card */}
              <div className="bg-white border border-[#c4c7c7] rounded-xl p-6">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <span className="text-xs font-semibold text-[#444748] uppercase tracking-widest block mb-1">
                      {isCancelled ? "Order Status" : "Estimated Delivery"}
                    </span>
                    {isCancelled ? (
                      <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#ba1a1a]">Order Cancelled</h2>
                    ) : order.status === "delivered" ? (
                      <h2 className="font-['Playfair_Display'] text-2xl font-bold text-black">Delivered!</h2>
                    ) : (
                      <h2 className="font-['Playfair_Display'] text-2xl font-bold text-black">
                        {estimatedDelivery(order.createdAt)}
                      </h2>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    isCancelled ? "bg-[#ffdad6] text-[#ba1a1a]" :
                    order.status === "delivered" ? "bg-green-100 text-green-800" :
                    "bg-[#1c1b1b] text-[#9f97ff]"
                  }`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
                {!isCancelled && (
                  <>
                    <div className="relative w-full h-2 bg-[#e2e2e2] rounded-full overflow-hidden mb-2">
                      <div
                        className="absolute top-0 left-0 h-full bg-black rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#747878]">
                      {order.status === "delivered"
                        ? "Your order has been delivered."
                        : `Your order is currently in the "${order.status.replace(/_/g, " ")}" phase.`}
                    </p>
                  </>
                )}
              </div>

              {/* 5-step timeline */}
              {!isCancelled && (
                <div className="bg-white border border-[#c4c7c7] rounded-xl p-6">
                  <h3 className="font-['Playfair_Display'] text-xl font-semibold text-black mb-8">Order Journey</h3>
                  <div className="relative">
                    {/* connector line */}
                    <div className="absolute left-4 md:left-0 md:top-4 md:w-full w-0.5 h-[calc(100%-2rem)] md:h-0.5 bg-[#e2e2e2]" />
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-y-8 md:gap-y-0 relative">
                      {STATUS_STEPS.map((step, idx) => {
                        const done = idx <= activeStep;
                        const active = idx === activeStep;
                        return (
                          <div key={step.key} className="flex md:flex-col items-center md:text-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 md:mb-4 transition-all ${
                              done ? "bg-black text-white shadow-[0_0_0_4px_rgba(0,0,0,0.1)]" : "bg-[#e2e2e2] text-[#747878]"
                            } ${active ? "scale-110" : ""}`}>
                              <span className="material-symbols-outlined text-[18px]"
                                style={{ fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}>
                                {done && idx < activeStep ? "check" : step.icon}
                              </span>
                            </div>
                            <div className="ml-4 md:ml-0">
                              <p className={`text-xs font-semibold uppercase tracking-wider ${done ? "text-black" : "text-[#747878]"}`}>
                                {step.label}
                              </p>
                              {order.statusHistory.find((h) => h.status === step.key) ? (
                                <p className="text-xs text-[#747878] mt-0.5">
                                  {new Date(order.statusHistory.find((h) => h.status === step.key)!.createdAt)
                                    .toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              ) : idx > activeStep ? (
                                <p className="text-xs text-[#c4c7c7] mt-0.5">Pending</p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Courier / tracking info */}
              {(order.trackingNumber || order.courierName) && (
                <div className="bg-[#f4f3f3] border border-[#c4c7c7] rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-[#c4c7c7]">
                      <span className="material-symbols-outlined text-black text-2xl">package_2</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">{order.courierName ?? "Courier"}</p>
                      <p className="text-sm text-[#444748]">Tracking: {order.trackingNumber}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status history log */}
              {order.statusHistory.length > 0 && (
                <div className="bg-white border border-[#c4c7c7] rounded-xl p-6">
                  <h3 className="font-['Playfair_Display'] text-xl font-semibold text-black mb-5">Activity Log</h3>
                  <ul className="space-y-4">
                    {[...order.statusHistory].reverse().map((h, i) => (
                      <li key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-[#5951b4] mt-1.5 flex-shrink-0" />
                          {i < order.statusHistory.length - 1 && <div className="w-px flex-1 bg-[#e2e2e2] mt-1" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-semibold text-black capitalize">{h.status.replace(/_/g, " ")}</p>
                          {h.note && <p className="text-xs text-[#444748] mt-0.5">{h.note}</p>}
                          <p className="text-xs text-[#747878] mt-1">
                            {new Date(h.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Search different order */}
              <button
                onClick={() => { setOrder(null); setSearched(false); setError(""); router.replace("/order-tracking"); }}
                className="text-sm text-[#5951b4] font-semibold hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Track a different order
              </button>
            </div>

            {/* Right sidebar — order summary */}
            <div className="space-y-6">
              <div className="bg-[#e2e2e2] rounded-xl p-6 sticky top-24">
                <h3 className="font-['Playfair_Display'] text-xl font-semibold text-black mb-5 pb-4 border-b border-[#c4c7c7]">
                  Order Summary
                </h3>
                <p className="text-xs font-semibold text-[#5951b4] mb-4">#{order.orderNumber}</p>

                {/* Items */}
                <div className="space-y-3 mb-5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-black truncate">{item.productNameSnapshot}</p>
                        <p className="text-xs text-[#747878]">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-black flex-shrink-0">৳{(item.unitPrice * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-[#c4c7c7] pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-[#444748]">
                    <span>Subtotal</span><span>৳{Number(order.subtotal).toLocaleString()}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Discount</span><span>−৳{Number(order.discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#444748]">
                    <span>Shipping</span>
                    <span>{Number(order.shippingFee) === 0 ? "Free" : `৳${Number(order.shippingFee).toLocaleString()}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-black pt-2 border-t border-[#c4c7c7]">
                    <span>Total</span><span>৳{Number(order.total).toLocaleString()}</span>
                  </div>
                </div>

                {/* Shipping address */}
                {order.shippingAddress && (
                  <div className="mt-5 pt-5 border-t border-[#c4c7c7]">
                    <p className="text-xs font-semibold text-[#444748] uppercase tracking-widest mb-2">Shipping To</p>
                    <p className="text-sm font-semibold text-black">{order.shippingAddress.name}</p>
                    <p className="text-sm text-[#444748]">{order.shippingAddress.address}</p>
                    <p className="text-sm text-[#444748]">{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                  </div>
                )}

                <Link
                  href="/shop"
                  className="mt-6 w-full flex items-center justify-center gap-2 bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#5951b4] transition-colors rounded-lg"
                >
                  Continue Shopping
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
