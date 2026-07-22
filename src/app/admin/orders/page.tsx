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
  pending_payment: "bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)]",
  confirmed: "bg-[color:var(--accent-tint)] text-[color:var(--accent)]",
  packed: "bg-[color:var(--accent-tint)] text-[color:var(--accent)]",
  shipped: "bg-[color:var(--accent)] text-[color:var(--accent)]",
  delivered: "bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)]",
  cancelled: "bg-[color:var(--danger-tint)] text-[color:var(--danger)]",
  refunded: "bg-[color:var(--warning-tint)] text-[color:var(--warning)]",
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

  // Declared before the handlers that call it — a memoized callback is a
  // `const`, so referencing it from an earlier function relies on call-time
  // ordering and blocks the React compiler from preserving the memo.
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
                    ? "bg-accent text-accent-fg"
                    : "border border-[color:var(--fg-subtle)] text-[color:var(--fg-muted)] hover:border-line-strong"
                }`}
              >
                {FILTER_LABELS[s] ?? s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-muted)] text-[18px]">search</span>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 bg-surface border border-[color:var(--fg-subtle)] rounded-full text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)] w-56 transition-all"
                placeholder="Search orders..."
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface rounded-2xl border border-[color:var(--line)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[color:var(--surface-raised)] border-b border-[color:var(--fg-subtle)]">
                  {["Order ID", "Customer", "Date", "Items", "Total", "Payment", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-4 text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--fg-subtle)]">
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center">
                    <div className="w-6 h-6 border-2 border-line-strong border-t-transparent rounded-full animate-spin mx-auto" />
                  </td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-[color:var(--fg-subtle)] text-sm">No orders found.</td></tr>
                ) : orders.map((o) => {
                  const initials = (o.user?.name ?? "G").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={o.id} className="hover:bg-[color:var(--canvas)] transition-colors group cursor-pointer" onClick={() => openOrder(o)}>
                      <td className="px-6 py-5 text-[13px] font-semibold text-fg">
                        #{o.orderNumber}
                        {o.isGift && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
                            🎁 Gift
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[color:var(--accent-tint)] flex items-center justify-center text-[color:var(--accent)] font-bold text-[11px] flex-shrink-0">
                            {initials}
                          </div>
                          <span className="text-[14px] text-[color:var(--fg)]">{o.user?.name ?? "Guest"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[14px] text-[color:var(--fg-muted)]">
                        {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-5 text-[14px] text-[color:var(--fg-muted)]">{o.items.length} {o.items.length === 1 ? "Item" : "Items"}</td>
                      <td className="px-6 py-5 font-semibold text-[18px] text-fg">৳{Number(o.total).toLocaleString()}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase">
                          <span className="material-symbols-outlined text-[14px]">credit_card</span>
                          {o.paymentMethod || "Card"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${STATUS_CHIP[o.status] ?? "bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)]"}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 text-[color:var(--fg-muted)] hover:text-fg opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div className="px-6 py-4 flex items-center justify-between border-t border-[color:var(--fg-subtle)] bg-[color:var(--surface)]">
            <span className="text-[12px] text-[color:var(--fg-muted)]">Showing {Math.min((page-1)*20+1, total)}–{Math.min(page*20, total)} of {total} orders</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-[color:var(--fg-subtle)] hover:bg-[color:var(--surface-raised)] transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-2 rounded-lg border border-[color:var(--fg-subtle)] hover:bg-[color:var(--surface-raised)] transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[color:var(--surface-raised)] rounded-2xl border border-[color:var(--line)]">
            <span className="text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-widest">Total Orders</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-fg">{total}</span>
            </div>
          </div>
          <div className="p-6 bg-[color:var(--surface-raised)] rounded-2xl border border-[color:var(--line)]">
            <span className="text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-widest">Pending Orders</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-fg">
                {orders.filter((o) => o.status === "pending_payment").length}
              </span>
              <span className="text-[color:var(--fg-muted)] text-[13px] font-medium">this page</span>
            </div>
          </div>
          <div className="p-6 bg-[color:var(--surface-raised)] rounded-2xl border border-[color:var(--line)]">
            <span className="text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-widest">Delivered</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-fg">
                {orders.filter((o) => o.status === "delivered").length}
              </span>
              <span className="text-[color:var(--fg-muted)] text-[13px] font-medium">this page</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <aside className="w-full max-w-lg bg-surface h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[color:var(--fg-subtle)]">
              <h3 className="text-xl font-bold text-fg">Order #{selectedOrder.orderNumber}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-[color:var(--fg-muted)] hover:text-fg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 p-6 space-y-6">
              {/* Courier bot verdict + dispatch */}
              <div>
                <p className="text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-widest mb-3">Courier Bot</p>
                {selectedOrder.courierDispatch ? (
                  <div className="space-y-3">
                    <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${
                      selectedOrder.courierDispatch.riskVerdict === "risky"
                        ? "border-[color:var(--danger)]/40 bg-[color:var(--danger-tint)]/40"
                        : selectedOrder.courierDispatch.riskVerdict === "neutral"
                        ? "border-[color:var(--warning)]/30 bg-[color:var(--warning-tint)]"
                        : "border-green-600/30 bg-green-50"
                    }`}>
                      <span className="material-symbols-outlined text-xl mt-0.5">
                        {selectedOrder.courierDispatch.riskVerdict === "risky" ? "warning"
                          : selectedOrder.courierDispatch.riskVerdict === "neutral" ? "help" : "verified"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-fg capitalize">
                          {selectedOrder.courierDispatch.riskVerdict === "prepaid" ? "Prepaid — safe to ship" : `${selectedOrder.courierDispatch.riskVerdict} customer`}
                        </p>
                        <p className="text-xs text-[color:var(--fg-muted)] mt-0.5">{selectedOrder.courierDispatch.riskDetails?.reason}</p>
                      </div>
                    </div>

                    {selectedOrder.courierDispatch.consignmentId ? (
                      <div className="p-4 rounded-xl bg-[color:var(--surface)] text-sm space-y-1">
                        <p className="font-bold text-fg capitalize">
                          {selectedOrder.courierDispatch.autoDispatch ? "Auto-dispatched" : "Dispatched"} via {selectedOrder.courierDispatch.courier}
                        </p>
                        <p className="text-xs text-[color:var(--fg-muted)]">Consignment: <span className="font-mono">{selectedOrder.courierDispatch.consignmentId}</span></p>
                        {selectedOrder.courierDispatch.courierStatus && (
                          <p className="text-xs text-[color:var(--fg-muted)]">Courier status: {selectedOrder.courierDispatch.courierStatus}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => sendToCourier(selectedOrder.id, "steadfast")} disabled={dispatching}
                          className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-accent text-accent-fg hover:bg-[color:var(--accent)] transition-colors disabled:opacity-50">
                          {dispatching ? "Sending…" : "Send via Steadfast"}
                        </button>
                        <button onClick={() => sendToCourier(selectedOrder.id, "pathao")} disabled={dispatching}
                          className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-line-strong text-fg hover:bg-accent-hover transition-colors disabled:opacity-50">
                          {dispatching ? "Sending…" : "Send via Pathao"}
                        </button>
                      </div>
                    )}
                    {(dispatchError || selectedOrder.courierDispatch.lastError) && !selectedOrder.courierDispatch.consignmentId && (
                      <p className="text-[12px] text-[color:var(--danger)] font-medium bg-[color:var(--danger-tint)] rounded-lg px-3 py-2">
                        {dispatchError || selectedOrder.courierDispatch.lastError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[color:var(--fg-subtle)]">Not evaluated yet (order predates the courier bot).</p>
                    <div className="flex gap-2">
                      <button onClick={() => sendToCourier(selectedOrder.id, "steadfast")} disabled={dispatching}
                        className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-accent text-accent-fg hover:bg-[color:var(--accent)] transition-colors disabled:opacity-50">
                        {dispatching ? "Sending…" : "Send via Steadfast"}
                      </button>
                      <button onClick={() => sendToCourier(selectedOrder.id, "pathao")} disabled={dispatching}
                        className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-line-strong text-fg hover:bg-accent-hover transition-colors disabled:opacity-50">
                        {dispatching ? "Sending…" : "Send via Pathao"}
                      </button>
                    </div>
                    {dispatchError && (
                      <p className="text-[12px] text-[color:var(--danger)] font-medium bg-[color:var(--danger-tint)] rounded-lg px-3 py-2">{dispatchError}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-widest mb-3">Courier &amp; Tracking</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <input
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="Courier (e.g. Pathao, Steadfast)"
                    className="px-3 py-2.5 border border-[color:var(--fg-subtle)] rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
                  />
                  <input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking number"
                    className="px-3 py-2.5 border border-[color:var(--fg-subtle)] rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
                  />
                </div>
                <p className="text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-widest mb-3">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {ORDER_STATUSES.map((s) => (
                    <button key={s} disabled={selectedOrder.status === s || updatingStatus}
                      onClick={() => updateOrderStatus(selectedOrder.id, s)}
                      className={`py-2 px-3 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                        selectedOrder.status === s ? "bg-accent text-accent-fg" : "border border-[color:var(--fg-subtle)] text-[color:var(--fg-muted)] hover:bg-[color:var(--surface)] disabled:opacity-40"
                      }`}>
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
                {statusError && (
                  <p className="mt-3 text-[12px] text-[color:var(--danger)] font-medium bg-[color:var(--danger-tint)] rounded-lg px-3 py-2">{statusError}</p>
                )}
              </div>
              {selectedOrder.isGift && (
                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-[color:var(--accent)] bg-[color:var(--accent-tint)]">
                  <span className="text-2xl">🎁</span>
                  <div>
                    <p className="text-sm font-bold text-[color:var(--accent)]">Gift Order — Premium Packaging Required</p>
                    <p className="text-xs text-[color:var(--fg-muted)]">Include gift box &amp; ribbon wrap. Gift fee: +৳{Number(selectedOrder.giftFee)}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-widest mb-3">Customer</p>
                <div className="bg-[color:var(--surface)] rounded-lg p-4 space-y-1">
                  <p className="text-sm font-semibold text-fg">{selectedOrder.user?.name ?? selectedOrder.shippingAddress?.name ?? "Guest"}</p>
                  <p className="text-sm text-[color:var(--fg-muted)]">{selectedOrder.user?.email ?? selectedOrder.guestEmail ?? ""}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-widest mb-3">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => {
                    const snap = item.variantSnapshot;
                    const variant = [snap?.color, snap?.size].filter(Boolean).join(" / ");
                    return (
                      <div key={i} className="flex items-center justify-between bg-[color:var(--surface)] rounded-lg px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-fg">{item.productNameSnapshot}</p>
                          {variant && (
                            <p className="text-xs font-medium text-[color:var(--accent)] mt-0.5">{variant}</p>
                          )}
                          {snap?.sku && (
                            <p className="text-[11px] text-[color:var(--fg-subtle)] font-mono">SKU: {snap.sku}</p>
                          )}
                          <p className="text-xs text-[color:var(--fg-subtle)] mt-0.5">Qty: {item.quantity} × ৳{Number(item.unitPrice).toLocaleString()}</p>
                        </div>
                        <p className="text-sm font-bold text-fg">৳{Number(item.unitPrice * item.quantity).toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {selectedOrder.shippingAddress && (
                <div>
                  <p className="text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-widest mb-3">Shipping Address</p>
                  <div className="bg-[color:var(--surface)] rounded-lg p-4 text-sm text-[color:var(--fg-muted)] space-y-0.5">
                    <p className="font-semibold text-fg">{selectedOrder.shippingAddress.name}</p>
                    <p>{selectedOrder.shippingAddress.address}</p>
                    <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.postalCode}</p>
                  </div>
                </div>
              )}
              <div className="border-t border-[color:var(--fg-subtle)] pt-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-[color:var(--fg-muted)] uppercase tracking-widest">Total</p>
                <p className="text-2xl font-bold text-fg">৳{Number(selectedOrder.total).toLocaleString()}</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
