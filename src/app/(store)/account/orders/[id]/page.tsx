"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const STATUS_STEPS = [
  { key: "pending_payment", label: "Order Placed", icon: "receipt_long" },
  { key: "confirmed",       label: "Confirmed",    icon: "task_alt" },
  { key: "packed",          label: "Packed",        icon: "inventory_2" },
  { key: "shipped",         label: "Shipped",       icon: "local_shipping" },
  { key: "delivered",       label: "Delivered",     icon: "home" },
];

interface OrderItem { id: string; productNameSnapshot: string; quantity: number; unitPrice: number; variantSnapshot: { color?: string; size?: string }; variant?: { product?: { slug: string; images?: { url: string }[] } } | null; }
interface StatusHistory { status: string; note?: string; createdAt: string; }
interface Order {
  id: string; orderNumber: string; status: string; paymentStatus: string; paymentMethod: string;
  subtotal: number; discount: number; shippingFee: number; total: number; couponCode?: string;
  courierName?: string; trackingNumber?: string; notes?: string;
  shippingAddress: { fullName: string; line1: string; district: string; phone: string };
  isGift: boolean; giftFee: number; createdAt: string;
  items: OrderItem[];
  statusHistory: StatusHistory[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ag_authed");
    fetch(`/api/account/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setOrder(d.order ?? null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!order) return <div className="text-center py-20 text-[#747878]">Order not found.</div>;

  const currentStep = STATUS_STEPS.findIndex(s => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link href="/account/orders" className="flex items-center gap-1.5 text-sm text-[#747878] hover:text-black transition-colors">
        <span className="material-symbols-outlined text-base">arrow_back</span> All Orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-['Playfair_Display'] text-2xl font-bold text-black">{order.orderNumber}</h2>
          <p className="text-sm text-[#747878] mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {order.isGift && (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}>
            🎁 Gift Order
          </span>
        )}
      </div>

      {/* Timeline */}
      {!isCancelled ? (
        <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6">
          <h3 className="font-semibold text-sm text-black mb-6">Order Progress</h3>
          <div className="flex items-start justify-between gap-1 relative">
            {/* Connector line */}
            <div className="absolute top-5 left-5 right-5 h-0.5" style={{ background: "#f0f0f0", zIndex: 0 }}>
              <div className="h-full transition-all duration-700"
                style={{
                  background: "linear-gradient(90deg, #c9a84c, #d4b05a)",
                  width: currentStep < 0 ? "0%" : `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%`,
                }} />
            </div>
            {STATUS_STEPS.map((s, i) => {
              const done = i <= currentStep;
              const current = i === currentStep;
              return (
                <div key={s.key} className="flex flex-col items-center gap-2 relative z-10" style={{ flex: 1 }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: done ? (current ? "#c9a84c" : "#12103a") : "#f4f3f3",
                      border: current ? "3px solid rgba(201,168,76,0.3)" : "none",
                      boxShadow: current ? "0 0 0 4px rgba(201,168,76,0.15)" : "none",
                    }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: done ? "#fff" : "#c4c7c7", fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}>
                      {s.icon}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold" style={{ color: done ? "#12103a" : "#c4c7c7" }}>{s.label}</p>
                    {done && order.statusHistory.find(h => h.status === s.key) && (
                      <p className="text-[9px] mt-0.5" style={{ color: "#c4c7c7" }}>
                        {new Date(order.statusHistory.find(h => h.status === s.key)!.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Courier info */}
          {order.courierName && (
            <div className="mt-5 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#f9f9f9" }}>
              <span className="material-symbols-outlined text-xl" style={{ color: "#c9a84c" }}>local_shipping</span>
              <div>
                <p className="text-xs font-semibold text-black">{order.courierName}</p>
                {order.trackingNumber && <p className="text-xs text-[#747878]">Tracking: <span className="font-mono font-semibold text-black">{order.trackingNumber}</span></p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#ffdad6] rounded-2xl p-5 flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl text-[#ba1a1a]">cancel</span>
          <div>
            <p className="font-bold text-[#ba1a1a] text-sm">Order Cancelled</p>
            <p className="text-xs text-[#ba1a1a]/70 mt-0.5">If you were charged, a refund will be processed within 3–5 business days.</p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0f0f0]">
          <h3 className="font-semibold text-sm text-black">{order.items.length} Item{order.items.length !== 1 ? "s" : ""}</h3>
        </div>
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-5 py-4 border-b border-[#f4f3f3] last:border-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#f4f3f3] shrink-0">
              {item.variant?.product?.images?.[0]?.url ? (
                <Image src={item.variant.product.images[0].url} alt={item.productNameSnapshot} width={56} height={56} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-[#c4c7c7]">checkroom</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black truncate">{item.productNameSnapshot}</p>
              <p className="text-xs text-[#747878] mt-0.5">
                {[item.variantSnapshot?.color, item.variantSnapshot?.size].filter(Boolean).join(" · ")} · Qty {item.quantity}
              </p>
            </div>
            <p className="text-sm font-bold text-black shrink-0">৳{(Number(item.unitPrice) * item.quantity).toLocaleString()}</p>
          </div>
        ))}
        {/* Summary */}
        <div className="px-5 py-4 space-y-2" style={{ background: "#fafafa" }}>
          {[
            { label: "Subtotal", value: `৳${Number(order.subtotal).toLocaleString()}` },
            order.discount > 0 ? { label: `Coupon (${order.couponCode ?? ""})`, value: `-৳${Number(order.discount).toLocaleString()}`, gold: true } : null,
            { label: "Shipping", value: Number(order.shippingFee) === 0 ? "Free" : `৳${Number(order.shippingFee).toLocaleString()}` },
            order.giftFee > 0 ? { label: "Gift Packaging", value: `৳${Number(order.giftFee).toLocaleString()}` } : null,
          ].filter(Boolean).map((row) => row && (
            <div key={row.label} className="flex justify-between text-sm">
              <span style={{ color: "#747878" }}>{row.label}</span>
              <span style={{ color: (row as { gold?: boolean }).gold ? "#c9a84c" : "#444748", fontWeight: (row as { gold?: boolean }).gold ? 600 : 400 }}>{row.value}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-[#e8e8e8]">
            <span>Total</span>
            <span>৳{Number(order.total).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] p-5">
        <h3 className="font-semibold text-sm text-black mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-base" style={{ color: "#c9a84c" }}>location_on</span>
          Delivery Address
        </h3>
        <p className="text-sm text-[#444748]">
          {order.shippingAddress.fullName}<br />
          {order.shippingAddress.line1}, {order.shippingAddress.district}<br />
          {order.shippingAddress.phone}
        </p>
      </div>
    </div>
  );
}
