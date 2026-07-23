"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AuraLoadingScreen from "@/components/ui/AuraLoadingScreen";

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

  if (loading) return <AuraLoadingScreen />;
  if (!order) return <div className="text-center py-20 text-fg-subtle">Order not found.</div>;

  const currentStep = STATUS_STEPS.findIndex(s => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link href="/account/orders" className="flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg transition-colors">
        <span className="material-symbols-outlined text-base">arrow_back</span> All Orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="dd-display text-2xl text-fg">{order.orderNumber}</h2>
          <p className="text-sm text-fg-subtle mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {order.isGift && (
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent-tint text-accent border border-accent/25">
            Gift Order
          </span>
        )}
      </div>

      {/* Timeline */}
      {!isCancelled ? (
        <div className="bg-surface rounded-2xl border border-line p-6">
          <h3 className="font-medium text-sm text-fg mb-6">Order Progress</h3>
          <div className="flex items-start justify-between gap-1 relative">
            {/* Connector line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-line" style={{ zIndex: 0 }}>
              <div className="h-full bg-accent transition-all duration-700"
                style={{ width: currentStep < 0 ? "0%" : `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }} />
            </div>
            {STATUS_STEPS.map((s, i) => {
              const done = i <= currentStep;
              const current = i === currentStep;
              return (
                <div key={s.key} className="flex flex-col items-center gap-2 relative z-10" style={{ flex: 1 }}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    done ? (current ? "bg-accent" : "bg-fg") : "bg-surface-raised"
                  } ${current ? "ring-4 ring-accent/20" : ""}`}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: done ? (current ? "var(--accent-fg)" : "var(--canvas)") : "var(--fg-subtle)", fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}>
                      {s.icon}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-medium ${done ? "text-fg" : "text-fg-subtle"}`}>{s.label}</p>
                    {done && order.statusHistory.find(h => h.status === s.key) && (
                      <p className="text-[9px] mt-0.5 text-fg-subtle">
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
            <div className="mt-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-raised">
              <span className="material-symbols-outlined text-xl text-accent">local_shipping</span>
              <div>
                <p className="text-xs font-medium text-fg">{order.courierName}</p>
                {order.trackingNumber && <p className="text-xs text-fg-subtle">Tracking: <span className="font-mono font-medium text-fg">{order.trackingNumber}</span></p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: "var(--danger-tint)" }}>
          <span className="material-symbols-outlined text-2xl" style={{ color: "var(--danger)" }}>cancel</span>
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--danger)" }}>Order Cancelled</p>
            <p className="text-xs mt-0.5 opacity-70" style={{ color: "var(--danger)" }}>If you were charged, a refund will be processed within 3–5 business days.</p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h3 className="font-medium text-sm text-fg">{order.items.length} Item{order.items.length !== 1 ? "s" : ""}</h3>
        </div>
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-raised shrink-0">
              {item.variant?.product?.images?.[0]?.url ? (
                <Image src={item.variant.product.images[0].url} alt={item.productNameSnapshot} width={56} height={56} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-fg-subtle">checkroom</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg truncate">{item.productNameSnapshot}</p>
              <p className="text-xs text-fg-subtle mt-0.5">
                {[item.variantSnapshot?.color, item.variantSnapshot?.size].filter(Boolean).join(" · ")} · Qty {item.quantity}
              </p>
            </div>
            <p className="text-sm font-medium text-fg shrink-0">৳{(Number(item.unitPrice) * item.quantity).toLocaleString()}</p>
          </div>
        ))}
        {/* Summary */}
        <div className="px-5 py-4 space-y-2 bg-surface-raised">
          {[
            { label: "Subtotal", value: `৳${Number(order.subtotal).toLocaleString()}` },
            order.discount > 0 ? { label: `Coupon (${order.couponCode ?? ""})`, value: `-৳${Number(order.discount).toLocaleString()}`, accent: true } : null,
            { label: "Shipping", value: Number(order.shippingFee) === 0 ? "Free" : `৳${Number(order.shippingFee).toLocaleString()}` },
            order.giftFee > 0 ? { label: "Gift Packaging", value: `৳${Number(order.giftFee).toLocaleString()}` } : null,
          ].filter(Boolean).map((row) => row && (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-fg-subtle">{row.label}</span>
              <span className={(row as { accent?: boolean }).accent ? "text-accent font-medium" : "text-fg-muted"}>{row.value}</span>
            </div>
          ))}
          <div className="flex justify-between font-medium text-base pt-2 border-t border-line text-fg">
            <span>Total</span>
            <span>৳{Number(order.total).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      <div className="bg-surface rounded-2xl border border-line p-5">
        <h3 className="font-medium text-sm text-fg mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-accent">location_on</span>
          Delivery Address
        </h3>
        <p className="text-sm text-fg-muted">
          {order.shippingAddress.fullName}<br />
          {order.shippingAddress.line1}, {order.shippingAddress.district}<br />
          {order.shippingAddress.phone}
        </p>
      </div>
    </div>
  );
}
