"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import StatusPill from "@/components/ui/StatusPill";
import Spinner from "@/components/ui/Spinner";
import { ArrowRight } from "@/components/ui/Button";

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
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <section className="px-4 md:px-12 pt-16 pb-10 max-w-6xl mx-auto text-center">
        <h1 className="dd-display text-4xl md:text-5xl text-fg mb-4">Track Your Order</h1>
        <p className="text-fg-muted text-lg max-w-xl mx-auto">
          Experience the journey of your curated pieces from our studio to your doorstep.
        </p>
      </section>

      {/* Lookup form */}
      {!order && (
        <section className="px-4 md:px-12 pb-16 max-w-xl mx-auto">
          <div className="bg-surface border border-line p-8" style={{ borderRadius: "var(--radius-card)" }}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-fg-muted uppercase tracking-widest mb-2">Order Number</label>
                <input
                  value={orderInput}
                  onChange={(e) => setOrderInput(e.target.value)}
                  className="field-input"
                  placeholder="e.g. AG82931ABCD"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted uppercase tracking-widest mb-2">Email Address <span className="font-normal text-fg-subtle normal-case">(the one used at checkout)</span></label>
                <input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  type="email"
                  className="field-input"
                  placeholder="email@example.com"
                />
              </div>
              {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-lg text-xs font-medium uppercase tracking-widest transition-colors disabled:opacity-50 mt-2 bg-accent text-accent-fg hover:bg-accent-hover"
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
          <Spinner size={32} />
        </div>
      )}

      {/* Tracking result */}
      {order && (
        <section className="px-4 md:px-12 pb-20 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left — main status */}
            <div className="lg:col-span-2 space-y-6">

              {/* ETA / status card */}
              <div className="bg-surface border border-line p-6" style={{ borderRadius: "var(--radius-card)" }}>
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <span className="text-xs font-medium text-fg-muted uppercase tracking-widest block mb-1">
                      {isCancelled ? "Order Status" : "Estimated Delivery"}
                    </span>
                    {isCancelled ? (
                      <h2 className="dd-display text-2xl" style={{ color: "var(--danger)" }}>Order Cancelled</h2>
                    ) : order.status === "delivered" ? (
                      <h2 className="dd-display text-2xl text-fg">Delivered!</h2>
                    ) : (
                      <h2 className="dd-display text-2xl text-fg">
                        {estimatedDelivery(order.createdAt)}
                      </h2>
                    )}
                  </div>
                  <StatusPill status={order.status} />
                </div>
                {!isCancelled && (
                  <>
                    <div className="relative w-full h-2 bg-surface-raised rounded-full overflow-hidden mb-2">
                      <div
                        className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-subtle">
                      {order.status === "delivered"
                        ? "Your order has been delivered."
                        : `Your order is currently in the "${order.status.replace(/_/g, " ")}" phase.`}
                    </p>
                  </>
                )}
              </div>

              {/* 5-step timeline */}
              {!isCancelled && (
                <div className="bg-surface border border-line p-6" style={{ borderRadius: "var(--radius-card)" }}>
                  <h3 className="dd-display text-xl text-fg mb-8">Order Journey</h3>
                  <div className="relative">
                    {/* connector line */}
                    <div className="absolute left-4 md:left-0 md:top-4 md:w-full w-0.5 h-[calc(100%-2rem)] md:h-0.5 bg-line" />
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-y-8 md:gap-y-0 relative">
                      {STATUS_STEPS.map((step, idx) => {
                        const done = idx <= activeStep;
                        const active = idx === activeStep;
                        return (
                          <div key={step.key} className="flex md:flex-col items-center md:text-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 md:mb-4 transition-all ${
                              done ? "bg-accent text-accent-fg" : "bg-surface-raised text-fg-subtle"
                            } ${active ? "scale-110" : ""}`}>
                              <span className="material-symbols-outlined text-[18px]"
                                style={{ fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}>
                                {done && idx < activeStep ? "check" : step.icon}
                              </span>
                            </div>
                            <div className="ml-4 md:ml-0">
                              <p className={`text-xs font-medium uppercase tracking-wider ${done ? "text-fg" : "text-fg-subtle"}`}>
                                {step.label}
                              </p>
                              {order.statusHistory.find((h) => h.status === step.key) ? (
                                <p className="text-xs text-fg-subtle mt-0.5">
                                  {new Date(order.statusHistory.find((h) => h.status === step.key)!.createdAt)
                                    .toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              ) : idx > activeStep ? (
                                <p className="text-xs text-fg-subtle opacity-60 mt-0.5">Pending</p>
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
                <div className="bg-surface-raised border border-line p-6 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderRadius: "var(--radius-card)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center border border-line">
                      <span className="material-symbols-outlined text-fg text-2xl">package_2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">{order.courierName ?? "Courier"}</p>
                      <p className="text-sm text-fg-muted">Tracking: {order.trackingNumber}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status history log */}
              {order.statusHistory.length > 0 && (
                <div className="bg-surface border border-line p-6" style={{ borderRadius: "var(--radius-card)" }}>
                  <h3 className="dd-display text-xl text-fg mb-5">Activity Log</h3>
                  <ul className="space-y-4">
                    {[...order.statusHistory].reverse().map((h, i) => (
                      <li key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                          {i < order.statusHistory.length - 1 && <div className="w-px flex-1 bg-line mt-1" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium text-fg capitalize">{h.status.replace(/_/g, " ")}</p>
                          {h.note && <p className="text-xs text-fg-muted mt-0.5">{h.note}</p>}
                          <p className="text-xs text-fg-subtle mt-1">
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
                className="text-sm text-accent font-medium hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Track a different order
              </button>
            </div>

            {/* Right sidebar — order summary */}
            <div className="space-y-6">
              <div className="bg-surface-raised p-6 sticky top-24" style={{ borderRadius: "var(--radius-card)" }}>
                <h3 className="dd-display text-xl text-fg mb-5 pb-4 border-b border-line">
                  Order Summary
                </h3>
                <p className="text-xs font-medium text-accent mb-4">#{order.orderNumber}</p>

                {/* Items */}
                <div className="space-y-3 mb-5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg truncate">{item.productNameSnapshot}</p>
                        <p className="text-xs text-fg-subtle">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-fg flex-shrink-0">৳{(item.unitPrice * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-line pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-fg-muted">
                    <span>Subtotal</span><span>৳{Number(order.subtotal).toLocaleString()}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between" style={{ color: "var(--success)" }}>
                      <span>Discount</span><span>−৳{Number(order.discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-fg-muted">
                    <span>Shipping</span>
                    <span>{Number(order.shippingFee) === 0 ? "Free" : `৳${Number(order.shippingFee).toLocaleString()}`}</span>
                  </div>
                  <div className="flex justify-between font-medium text-fg pt-2 border-t border-line">
                    <span>Total</span><span>৳{Number(order.total).toLocaleString()}</span>
                  </div>
                </div>

                {/* Shipping address */}
                {order.shippingAddress && (
                  <div className="mt-5 pt-5 border-t border-line">
                    <p className="text-xs font-medium text-fg-muted uppercase tracking-widest mb-2">Shipping To</p>
                    <p className="text-sm font-medium text-fg">{order.shippingAddress.name}</p>
                    <p className="text-sm text-fg-muted">{order.shippingAddress.address}</p>
                    <p className="text-sm text-fg-muted">{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                  </div>
                )}

                <Link
                  href="/shop"
                  className="mt-6 w-full flex items-center justify-center gap-2 py-3 text-xs font-medium uppercase tracking-widest transition-colors rounded-lg bg-accent text-accent-fg hover:bg-accent-hover"
                >
                  Continue Shopping
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
