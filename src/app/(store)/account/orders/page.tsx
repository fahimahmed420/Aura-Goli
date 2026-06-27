"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const STATUS_CHIP: Record<string, { bg: string; text: string }> = {
  pending_payment: { bg: "bg-[#eeeeee]", text: "text-[#444748]" },
  confirmed: { bg: "bg-[#e4dfff]", text: "text-[#41379b]" },
  packed: { bg: "bg-[#e4dfff]", text: "text-[#41379b]" },
  shipped: { bg: "bg-[#9f97ff]", text: "text-[#33288d]" },
  delivered: { bg: "bg-[#e5e2e1]", text: "text-[#474746]" },
  cancelled: { bg: "bg-[#ffdad6]", text: "text-[#ba1a1a]" },
};

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
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === "In Progress") return ["confirmed", "packed", "shipped"].includes(o.status);
    if (filter === "Delivered") return o.status === "delivered";
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Playfair_Display'] text-[28px] font-semibold text-black">My Orders</h2>
        <p className="text-[#444748] text-[14px] mt-1">Track and manage your purchase history.</p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
              filter === f ? "bg-black text-white" : "border border-[#e8e8e8] text-[#444748] hover:border-black"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e8e8e8] rounded-2xl p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-[#c4c7c7] mb-4 block">receipt_long</span>
          <h3 className="font-['Playfair_Display'] text-[22px] font-semibold text-black mb-2">No orders yet</h3>
          <p className="text-[#444748] text-[14px] mb-6">When you place your first order, it will appear here.</p>
          <Link href="/shop" className="inline-block bg-black text-white px-8 py-3 rounded-full text-[13px] font-semibold hover:opacity-80 transition-opacity">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const chip = STATUS_CHIP[order.status] ?? { bg: "bg-[#eeeeee]", text: "text-[#444748]" };
            return (
              <div key={order.id} className="bg-white border border-[#e8e8e8] rounded-2xl overflow-hidden">
                {/* Order header */}
                <div className="px-6 py-4 bg-[#f4f3f3] flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e8e8]">
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-[11px] font-semibold text-[#444748] uppercase tracking-wider">Order Placed</p>
                      <p className="text-[14px] font-semibold text-black mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[#444748] uppercase tracking-wider">Total</p>
                      <p className="text-[14px] font-semibold text-black mt-0.5">৳{Number(order.total).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[#444748] uppercase tracking-wider">Order #</p>
                      <p className="text-[14px] font-semibold text-black mt-0.5">{order.orderNumber}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${chip.bg} ${chip.text}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Order body */}
                <div className="px-6 py-5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Product images */}
                    <div className="flex gap-2 flex-shrink-0">
                      {order.items.slice(0, 3).map((item, i) => {
                        const imgUrl = item.variant?.product?.images?.[0]?.url;
                        return (
                          <div key={i} className="w-20 h-24 rounded-xl bg-[#eeeeee] overflow-hidden relative flex-shrink-0">
                            {imgUrl ? (
                              <Image src={imgUrl} alt={item.productNameSnapshot} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#c4c7c7] text-2xl">checkroom</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex-1">
                      {order.items.map((item, i) => (
                        <div key={i}>
                          <p className="font-semibold text-[15px] text-black">{item.productNameSnapshot}</p>
                          <p className="text-[13px] text-[#444748]">Qty: {item.quantity}</p>
                        </div>
                      ))}
                      {order.status === "shipped" && (
                        <p className="text-[13px] text-[#5951b4] font-semibold mt-2">Expected arrival in 2–4 business days</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end justify-center">
                      <Link href={`/account/orders/${order.id}`}
                        className="px-5 py-2 border border-black text-black text-[13px] font-semibold rounded-full hover:bg-black hover:text-white transition-all whitespace-nowrap">
                        Track Order
                      </Link>
                      {order.status === "delivered" && (
                        <button className="px-5 py-2 text-[13px] font-semibold text-[#5951b4] rounded-full hover:bg-[#e4dfff] transition-all whitespace-nowrap">
                          Leave Review
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
