"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface CourierDispatchInfo {
  riskVerdict: string;
  riskDetails: { reason?: string; deliveredCount?: number; cancelledCount?: number; source?: string } | null;
  autoDispatch: boolean;
  courier: string | null;
  consignmentId: string | null;
  trackingCode: string | null;
  courierStatus: string | null;
  lastError: string | null;
}

interface Order {
  id: string; orderNumber: string; status: string; paymentStatus: string;
  total: number; createdAt: string; paymentMethod: string;
  isGift: boolean; giftFee: number;
  courierName: string | null; trackingNumber: string | null; guestEmail: string | null;
  courierDispatch: CourierDispatchInfo | null;
  user: { name: string; email: string } | null;
  items: { productNameSnapshot: string; quantity: number; unitPrice: number; variantSnapshot: { color?: string; size?: string; sku?: string } | null }[];
  shippingAddress: { name: string; address: string; city: string; postalCode: string } | null;
}

const ORDER_STATUSES = ["pending_payment", "confirmed", "packed", "shipped", "delivered", "cancelled", "refunded"];

const STATUS_CHIP: Record<string, string> = {
  pending_payment: "bg-[#eeeeee] text-[#444748]",
  confirmed: "bg-[#e4dfff] text-[#41379b]",
  packed: "bg-[#e4dfff] text-[#41379b]",
  shipped: "bg-[#9f97ff] text-[#33288d]",
  delivered: "bg-[#e5e2e1] text-[#474746]",
  cancelled: "bg-[#ffdad6] text-[#ba1a1a]",
  refunded: "bg-[#fff8e1] text-[#b06000]",
};

const FILTER_LABELS: Record<string, string> = {
  "": "All Orders",
  pending_payment: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [statusError, setStatusError] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState("");

  function openOrder(o: Order) {
    setSelectedOrder(o);
    setCourierName(o.courierName ?? "");
    setTrackingNumber(o.trackingNumber ?? "");
    setStatusError("");
    setDispatchError("");
  }

  async function sendToCourier(orderId: string, courier: "steadfast" | "pathao") {
    setDispatching(true);
    setDispatchError("");
    const token = localStorage.getItem("adminToken");
    const res = await fetch(`/api/admin/orders/${orderId}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ courier }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.dispatch) {
      setSelectedOrder((o) => o ? {
        ...o,
        courierDispatch: data.dispatch,
        courierName: courier === "pathao" ? "Pathao" : "Steadfast",
        trackingNumber: data.dispatch.trackingCode ?? data.dispatch.consignmentId ?? o.trackingNumber,
      } : null);
      setCourierName(courier === "pathao" ? "Pathao" : "Steadfast");
      setTrackingNumber(data?.dispatch?.trackingCode ?? data?.dispatch?.consignmentId ?? "");
      fetchOrders();
    } else {
      setDispatchError(data?.error ?? "Dispatch failed.");
    }
    setDispatching(false);
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("adminToken");
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setOrders(data.orders ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }, [page, q, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function updateOrderStatus(orderId: string, newStatus: string) {
    setStatusError("");
    if (newStatus === "shipped" && (!courierName.trim() || !trackingNumber.trim())) {
      setStatusError("Enter the courier name and tracking number before marking as shipped.");
      return;
    }
    setUpdatingStatus(true);
    const token = localStorage.getItem("adminToken");
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        status: newStatus,
        ...(courierName.trim() && { courierName: courierName.trim() }),
        ...(trackingNumber.trim() && { trackingNumber: trackingNumber.trim() }),
      }),
    });
    if (res.ok) {
      setSelectedOrder((o) => o ? { ...o, status: newStatus, courierName: courierName.trim() || o.courierName, trackingNumber: trackingNumber.trim() || o.trackingNumber } : null);
      fetchOrders();
    } else {
      const data = await res.json().catch(() => null);
      setStatusError(data?.error ?? "Failed to update status.");
    }
    setUpdatingStatus(false);
  }

  const totalPages = Math.ceil(total / 20);
  const FILTER_KEYS = ["", "pending_payment", "confirmed", "shipped", "delivered", "cancelled", "refunded"];

  return (
    <AdminShell title="Orders Management">
      <div className="space-y-6">
        {/* Filter tabs + search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTER_KEYS.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${
                  statusFilter === s
                    ? "bg-black text-white"
                    : "border border-[#c4c7c7] text-[#444748] hover:border-black"
                }`}
              >
                {FILTER_LABELS[s] ?? s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#444748] text-[18px]">search</span>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 bg-white border border-[#c4c7c7] rounded-full text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#5951b4] w-56 transition-all"
                placeholder="Search orders..."
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#eeeeee] border-b border-[#c4c7c7]">
                  {["Order ID", "Customer", "Date", "Items", "Total", "Payment", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-4 text-[11px] font-semibold text-[#444748] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4c7c7]">
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                  </td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-[#747878] text-sm">No orders found.</td></tr>
                ) : orders.map((o) => {
                  const initials = (o.user?.name ?? "G").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={o.id} className="hover:bg-[#f9f9f9] transition-colors group cursor-pointer" onClick={() => openOrder(o)}>
                      <td className="px-6 py-5 text-[13px] font-semibold text-black">
                        #{o.orderNumber}
                        {o.isGift && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0eeff] text-[#5951b4]">
                            🎁 Gift
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#e4dfff] flex items-center justify-center text-[#5951b4] font-bold text-[11px] flex-shrink-0">
                            {initials}
                          </div>
                          <span className="text-[14px] text-[#1a1c1c]">{o.user?.name ?? "Guest"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[14px] text-[#444748]">
                        {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-5 text-[14px] text-[#444748]">{o.items.length} {o.items.length === 1 ? "Item" : "Items"}</td>
                      <td className="px-6 py-5 font-semibold text-[18px] text-black">৳{Number(o.total).toLocaleString()}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#444748] uppercase">
                          <span className="material-symbols-outlined text-[14px]">credit_card</span>
                          {o.paymentMethod || "Card"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${STATUS_CHIP[o.status] ?? "bg-[#eeeeee] text-[#444748]"}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 text-[#444748] hover:text-black opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined">more_horiz</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-[#c4c7c7] bg-[#f4f3f3]">
            <span className="text-[12px] text-[#444748]">Showing {Math.min((page-1)*20+1, total)}–{Math.min(page*20, total)} of {total} orders</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-[#c4c7c7] hover:bg-[#eeeeee] transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-2 rounded-lg border border-[#c4c7c7] hover:bg-[#eeeeee] transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#eeeeee] rounded-2xl border border-[#e8e8e8]">
            <span className="text-[11px] font-semibold text-[#444748] uppercase tracking-widest">Total Orders</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-['Playfair_Display'] text-3xl font-bold text-black">{total}</span>
            </div>
          </div>
          <div className="p-6 bg-[#eeeeee] rounded-2xl border border-[#e8e8e8]">
            <span className="text-[11px] font-semibold text-[#444748] uppercase tracking-widest">Pending Orders</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-['Playfair_Display'] text-3xl font-bold text-black">
                {orders.filter((o) => o.status === "pending_payment").length}
              </span>
              <span className="text-[#444748] text-[13px] font-medium">this page</span>
            </div>
          </div>
          <div className="p-6 bg-[#eeeeee] rounded-2xl border border-[#e8e8e8]">
            <span className="text-[11px] font-semibold text-[#444748] uppercase tracking-widest">Delivered</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-['Playfair_Display'] text-3xl font-bold text-black">
                {orders.filter((o) => o.status === "delivered").length}
              </span>
              <span className="text-[#444748] text-[13px] font-medium">this page</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <aside className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#c4c7c7]">
              <h3 className="font-['Playfair_Display'] text-xl font-bold text-black">Order #{selectedOrder.orderNumber}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-[#444748] hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 p-6 space-y-6">
              {/* Courier bot verdict + dispatch */}
              <div>
                <p className="text-[11px] font-semibold text-[#444748] uppercase tracking-widest mb-3">Courier Bot</p>
                {selectedOrder.courierDispatch ? (
                  <div className="space-y-3">
                    <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${
                      selectedOrder.courierDispatch.riskVerdict === "risky"
                        ? "border-[#ba1a1a]/40 bg-[#ffdad6]/40"
                        : selectedOrder.courierDispatch.riskVerdict === "neutral"
                        ? "border-[#b06000]/30 bg-[#fff8e1]"
                        : "border-green-600/30 bg-green-50"
                    }`}>
                      <span className="material-symbols-outlined text-xl mt-0.5">
                        {selectedOrder.courierDispatch.riskVerdict === "risky" ? "warning"
                          : selectedOrder.courierDispatch.riskVerdict === "neutral" ? "help" : "verified"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-black capitalize">
                          {selectedOrder.courierDispatch.riskVerdict === "prepaid" ? "Prepaid — safe to ship" : `${selectedOrder.courierDispatch.riskVerdict} customer`}
                        </p>
                        <p className="text-xs text-[#444748] mt-0.5">{selectedOrder.courierDispatch.riskDetails?.reason}</p>
                      </div>
                    </div>

                    {selectedOrder.courierDispatch.consignmentId ? (
                      <div className="p-4 rounded-xl bg-[#f4f3f3] text-sm space-y-1">
                        <p className="font-bold text-black capitalize">
                          {selectedOrder.courierDispatch.autoDispatch ? "Auto-dispatched" : "Dispatched"} via {selectedOrder.courierDispatch.courier}
                        </p>
                        <p className="text-xs text-[#444748]">Consignment: <span className="font-mono">{selectedOrder.courierDispatch.consignmentId}</span></p>
                        {selectedOrder.courierDispatch.courierStatus && (
                          <p className="text-xs text-[#444748]">Courier status: {selectedOrder.courierDispatch.courierStatus}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => sendToCourier(selectedOrder.id, "steadfast")} disabled={dispatching}
                          className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-black text-white hover:bg-[#5951b4] transition-colors disabled:opacity-50">
                          {dispatching ? "Sending…" : "Send via Steadfast"}
                        </button>
                        <button onClick={() => sendToCourier(selectedOrder.id, "pathao")} disabled={dispatching}
                          className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-black text-black hover:bg-black hover:text-white transition-colors disabled:opacity-50">
                          {dispatching ? "Sending…" : "Send via Pathao"}
                        </button>
                      </div>
                    )}
                    {(dispatchError || selectedOrder.courierDispatch.lastError) && !selectedOrder.courierDispatch.consignmentId && (
                      <p className="text-[12px] text-[#ba1a1a] font-medium bg-[#ffdad6] rounded-lg px-3 py-2">
                        {dispatchError || selectedOrder.courierDispatch.lastError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[#747878]">Not evaluated yet (order predates the courier bot).</p>
                    <div className="flex gap-2">
                      <button onClick={() => sendToCourier(selectedOrder.id, "steadfast")} disabled={dispatching}
                        className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-black text-white hover:bg-[#5951b4] transition-colors disabled:opacity-50">
                        {dispatching ? "Sending…" : "Send via Steadfast"}
                      </button>
                      <button onClick={() => sendToCourier(selectedOrder.id, "pathao")} disabled={dispatching}
                        className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-black text-black hover:bg-black hover:text-white transition-colors disabled:opacity-50">
                        {dispatching ? "Sending…" : "Send via Pathao"}
                      </button>
                    </div>
                    {dispatchError && (
                      <p className="text-[12px] text-[#ba1a1a] font-medium bg-[#ffdad6] rounded-lg px-3 py-2">{dispatchError}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#444748] uppercase tracking-widest mb-3">Courier &amp; Tracking</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <input
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="Courier (e.g. Pathao, Steadfast)"
                    className="px-3 py-2.5 border border-[#c4c7c7] rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-[#5951b4]"
                  />
                  <input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking number"
                    className="px-3 py-2.5 border border-[#c4c7c7] rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-[#5951b4]"
                  />
                </div>
                <p className="text-[11px] font-semibold text-[#444748] uppercase tracking-widest mb-3">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {ORDER_STATUSES.map((s) => (
                    <button key={s} disabled={selectedOrder.status === s || updatingStatus}
                      onClick={() => updateOrderStatus(selectedOrder.id, s)}
                      className={`py-2 px-3 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                        selectedOrder.status === s ? "bg-black text-white" : "border border-[#c4c7c7] text-[#444748] hover:bg-[#f4f3f3] disabled:opacity-40"
                      }`}>
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
                {statusError && (
                  <p className="mt-3 text-[12px] text-[#ba1a1a] font-medium bg-[#ffdad6] rounded-lg px-3 py-2">{statusError}</p>
                )}
              </div>
              {selectedOrder.isGift && (
                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#5951b4] bg-[#f0eeff]">
                  <span className="text-2xl">🎁</span>
                  <div>
                    <p className="text-sm font-bold text-[#5951b4]">Gift Order — Premium Packaging Required</p>
                    <p className="text-xs text-[#444748]">Include gift box &amp; ribbon wrap. Gift fee: +৳{Number(selectedOrder.giftFee)}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold text-[#444748] uppercase tracking-widest mb-3">Customer</p>
                <div className="bg-[#f4f3f3] rounded-lg p-4 space-y-1">
                  <p className="text-sm font-semibold text-black">{selectedOrder.user?.name ?? selectedOrder.shippingAddress?.name ?? "Guest"}</p>
                  <p className="text-sm text-[#444748]">{selectedOrder.user?.email ?? selectedOrder.guestEmail ?? ""}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#444748] uppercase tracking-widest mb-3">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => {
                    const snap = item.variantSnapshot;
                    const variant = [snap?.color, snap?.size].filter(Boolean).join(" / ");
                    return (
                      <div key={i} className="flex items-center justify-between bg-[#f4f3f3] rounded-lg px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-black">{item.productNameSnapshot}</p>
                          {variant && (
                            <p className="text-xs font-medium text-[#5951b4] mt-0.5">{variant}</p>
                          )}
                          {snap?.sku && (
                            <p className="text-[11px] text-[#b0a898] font-mono">SKU: {snap.sku}</p>
                          )}
                          <p className="text-xs text-[#747878] mt-0.5">Qty: {item.quantity} × ৳{Number(item.unitPrice).toLocaleString()}</p>
                        </div>
                        <p className="text-sm font-bold text-black">৳{Number(item.unitPrice * item.quantity).toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {selectedOrder.shippingAddress && (
                <div>
                  <p className="text-[11px] font-semibold text-[#444748] uppercase tracking-widest mb-3">Shipping Address</p>
                  <div className="bg-[#f4f3f3] rounded-lg p-4 text-sm text-[#444748] space-y-0.5">
                    <p className="font-semibold text-black">{selectedOrder.shippingAddress.name}</p>
                    <p>{selectedOrder.shippingAddress.address}</p>
                    <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.postalCode}</p>
                  </div>
                </div>
              )}
              <div className="border-t border-[#c4c7c7] pt-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#444748] uppercase tracking-widest">Total</p>
                <p className="font-['Playfair_Display'] text-2xl font-bold text-black">৳{Number(selectedOrder.total).toLocaleString()}</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
