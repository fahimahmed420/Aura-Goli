"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trackPurchase } from "@/lib/analytics";

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-8">
        <span className="material-symbols-outlined text-4xl text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      </div>

      <h1 className="font-['Playfair_Display'] text-4xl font-bold text-black mb-3">Order Confirmed!</h1>
      <p className="text-[#444748] text-lg mb-2">Thank you for shopping with Aura Goli.</p>
      {order && (
        <p className="text-[#5951b4] font-semibold mb-8">Order #{order.orderNumber}</p>
      )}

      {order && (
        <div className="bg-white border border-[#c4c7c7] rounded-lg p-6 text-left mb-8 space-y-4">
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-[#444748]">{item.productNameSnapshot} &times;{item.quantity}</span>
                <span className="font-semibold text-black">৳{(item.unitPrice * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#c4c7c7] pt-3 flex justify-between font-bold text-black">
            <span>Total</span><span>৳{Number(order.total).toLocaleString()}</span>
          </div>
          {order.shippingAddress && (
            <div className="border-t border-[#c4c7c7] pt-3 text-sm text-[#444748]">
              <p className="font-semibold text-black mb-1">Delivering to</p>
              <p>{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.address}, {order.shippingAddress.city}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-[#747878] mb-8">
        A confirmation email has been sent. Expected delivery in 3–5 business days.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href={isLoggedIn ? "/account/orders" : `/order-tracking${orderNumber ? `?order=${orderNumber}` : ""}`}
          className="inline-flex items-center justify-center gap-2 border border-black text-black px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
          <span className="material-symbols-outlined text-lg">receipt_long</span>
          {isLoggedIn ? "My Orders" : "Track Order"}
        </Link>
        <Link href="/shop"
          className="inline-flex items-center justify-center gap-2 bg-black text-white px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-[#5951b4] transition-colors">
          Continue Shopping
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmedClient() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderConfirmedInner />
    </Suspense>
  );
}
