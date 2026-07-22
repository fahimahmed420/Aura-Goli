"use client";

import { Suspense, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";
import { trackPurchase } from "@/lib/analytics";
import Spinner from "@/components/ui/Spinner";
import Button, { ArrowRight } from "@/components/ui/Button";

interface OrderDetail {
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: { productNameSnapshot: string; quantity: number; unitPrice: number }[];
  shippingAddress: { name: string; address: string; city: string } | null;
}

function OrderConfirmedInner() {
  const sp = useSearchParams();
  const orderNumber = sp.get("order");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => { setIsLoggedIn(!!localStorage.getItem("ag_authed")); }, []);

  useEffect(() => {
    if (!orderNumber) { setLoading(false); return; }
    // Guests authenticate the lookup with the email captured at checkout;
    // logged-in users are recognized via the HttpOnly session cookie.
    const orderEmail = sessionStorage.getItem("ag_order_email");
    const emailParam = orderEmail ? `?email=${encodeURIComponent(orderEmail)}` : "";
    fetch(`/api/orders/by-number/${orderNumber}${emailParam}`)
      .then((r) => r.json())
      .then((d) => {
        setOrder(d.order ?? null);
        // Fire the purchase conversion once per order (survives page refresh).
        if (d.order) {
          const key = `ag_purchase_tracked_${d.order.orderNumber}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            trackPurchase({
              orderId: d.order.orderNumber,
              value: Number(d.order.total),
              items: d.order.items?.map((it: { productNameSnapshot: string; quantity: number; unitPrice: number }) => ({
                name: it.productNameSnapshot, price: it.unitPrice, quantity: it.quantity,
              })),
            });
          }
        }
      })
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-canvas">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center bg-canvas min-h-screen">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8" style={{ background: "var(--success-tint)" }}>
        <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1", color: "var(--success)" }}>check_circle</span>
      </div>

      <h1 className="dd-display text-4xl text-fg mb-3">Order Confirmed!</h1>
      <p className="text-fg-muted text-lg mb-2">Thank you for shopping with Aura Goli.</p>
      {order && (
        <p className="text-accent font-medium mb-8">Order #{order.orderNumber}</p>
      )}

      {order && (
        <div className="bg-surface border border-line p-6 text-left mb-8 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-fg-muted">{item.productNameSnapshot} &times;{item.quantity}</span>
                <span className="font-medium text-fg">৳{(item.unitPrice * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-line pt-3 flex justify-between font-medium text-fg">
            <span>Total</span><span>৳{Number(order.total).toLocaleString()}</span>
          </div>
          {order.shippingAddress && (
            <div className="border-t border-line pt-3 text-sm text-fg-muted">
              <p className="font-medium text-fg mb-1">Delivering to</p>
              <p>{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.address}, {order.shippingAddress.city}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-fg-subtle mb-8">
        A confirmation email has been sent. Expected delivery in 3–5 business days.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          href={isLoggedIn ? "/account/orders" : `/order-tracking${orderNumber ? `?order=${orderNumber}` : ""}`}
          variant="secondary"
        >
          <span className="material-symbols-outlined text-lg">receipt_long</span>
          {isLoggedIn ? "My Orders" : "Track Order"}
        </Button>
        <Button href="/shop" variant="primary">
          Continue Shopping
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

export default function OrderConfirmedClient() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh] bg-canvas">
        <Spinner />
      </div>
    }>
      <OrderConfirmedInner />
    </Suspense>
  );
}
