"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StatusPill from "@/components/ui/StatusPill";
import EmptyState from "@/components/ui/EmptyState";
import AuraLoadingScreen from "@/components/ui/AuraLoadingScreen";

interface OrderItem {
  productNameSnapshot: string;
  quantity: number;
  variant?: { product?: { images?: { url: string }[] } } | null;
}
interface Order {
  id: string; orderNumber: string; status: string;
  total: number; createdAt: string;
  items: OrderItem[];
}

const FILTERS = ["All Orders", "In Progress", "Delivered"];

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All Orders");

  useEffect(() => {
    const token = localStorage.getItem("ag_authed");
    fetch("/api/account/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === "In Progress") return ["confirmed", "packed", "shipped"].includes(o.status);
    if (filter === "Delivered") return o.status === "delivered";
    return true;
  });

  if (loading) {
    return <AuraLoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="dd-display text-[28px] text-fg">My Orders</h2>
        <p className="text-fg-muted text-[14px] mt-1">Track and manage your purchase history.</p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
              filter === f ? "bg-accent text-accent-fg" : "border border-line text-fg-muted hover:border-line-strong"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl">
          <EmptyState
            icon="receipt_long"
            title="No orders yet"
            body="When you place your first order, it will appear here."
            action={{ href: "/shop", label: "Start Shopping" }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <div key={order.id} className="bg-surface border border-line rounded-2xl overflow-hidden">
              {/* Order header */}
              <div className="px-6 py-4 bg-surface-raised flex flex-wrap items-center justify-between gap-3 border-b border-line">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-[11px] font-medium text-fg-subtle uppercase tracking-wider">Order Placed</p>
                    <p className="text-[14px] font-medium text-fg mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-fg-subtle uppercase tracking-wider">Total</p>
                    <p className="text-[14px] font-medium text-fg mt-0.5">৳{Number(order.total).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-fg-subtle uppercase tracking-wider">Order #</p>
                    <p className="text-[14px] font-medium text-fg mt-0.5">{order.orderNumber}</p>
                  </div>
                </div>
                <StatusPill status={order.status} />
              </div>

              {/* Order body */}
              <div className="px-6 py-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product images */}
                  <div className="flex gap-2 flex-shrink-0">
                    {order.items.slice(0, 3).map((item, i) => {
                      const imgUrl = item.variant?.product?.images?.[0]?.url;
                      return (
                        <div key={i} className="w-20 h-24 rounded-xl bg-surface-raised overflow-hidden relative flex-shrink-0">
                          {imgUrl ? (
                            <Image src={imgUrl} alt={item.productNameSnapshot} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-fg-subtle text-2xl">checkroom</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex-1">
                    {order.items.map((item, i) => (
                      <div key={i}>
                        <p className="font-medium text-[15px] text-fg">{item.productNameSnapshot}</p>
                        <p className="text-[13px] text-fg-muted">Qty: {item.quantity}</p>
                      </div>
                    ))}
                    {order.status === "shipped" && (
                      <p className="text-[13px] text-accent font-medium mt-2">Expected arrival in 2–4 business days</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end justify-center">
                    <Link href={`/account/orders/${order.id}`}
                      className="px-5 py-2 border border-line-strong text-fg text-[13px] font-medium rounded-full hover:bg-surface-raised transition-all whitespace-nowrap">
                      Track Order
                    </Link>
                    {order.status === "delivered" && (
                      <button className="px-5 py-2 text-[13px] font-medium text-accent rounded-full hover:bg-accent-tint transition-all whitespace-nowrap">
                        Leave Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
