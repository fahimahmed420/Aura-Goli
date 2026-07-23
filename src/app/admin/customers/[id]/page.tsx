"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import Link from "next/link";

interface Order {
  id: string; orderNumber: string; status: string; paymentStatus: string;
  total: number; paymentMethod: string; createdAt: string;
  items: { productNameSnapshot: string; quantity: number }[];
}

interface Address {
  id: string; fullName: string; line1: string; city: string;
  district: string; phone: string; isDefault: boolean;
}

interface Customer {
  id: string; name: string; email: string; phone: string | null;
  isBlocked: boolean; createdAt: string; emailVerifiedAt: string | null;
  loyaltyPoints: number; avatarUrl: string | null;
  addresses: Address[];
  orders: Order[];
  _count: { orders: number; reviews: number; wishlistItems: number };
}

const STATUS_CHIP: Record<string, string> = {
  pending_payment: "bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)]",
  confirmed: "bg-[color:var(--accent-tint)] text-[color:var(--accent)]",
  packed: "bg-[color:var(--accent-tint)] text-[color:var(--accent)]",
  shipped: "bg-[color:var(--accent)] text-[color:var(--accent-fg)]",
  delivered: "bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)]",
  cancelled: "bg-[color:var(--danger-tint)] text-[color:var(--danger)]",
  refunded: "bg-[color:var(--warning-tint)] text-[color:var(--warning)]",
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    fetch(`/api/admin/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCustomer(d.user); })
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleBlock() {
    if (!customer) return;
    setToggling(true);
    const token = localStorage.getItem("adminToken");
    const res = await fetch(`/api/admin/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isBlocked: !customer.isBlocked }),
    });
    if (res.ok) setCustomer((c) => c ? { ...c, isBlocked: !c.isBlocked } : c);
    setToggling(false);
  }

  if (loading) {
    return (
      <AdminShell title="Customer">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-line-strong border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  if (!customer) {
    return (
      <AdminShell title="Customer">
        <div className="text-center py-20 text-[color:var(--fg-muted)]">Customer not found.</div>
      </AdminShell>
    );
  }

  const totalSpend = customer.orders.reduce((s, o) => s + Number(o.total), 0);
  const initials = customer.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AdminShell title="Customer Detail">
      <div className="max-w-5xl space-y-6">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[color:var(--fg-muted)] hover:text-fg transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Customers
        </button>

        {/* Profile card */}
        <div className="bg-surface rounded-2xl border border-[color:var(--line)] p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-bold text-xl shrink-0"
            style={{ background: "rgba(201,168,76,0.15)", color: "var(--accent)", border: "2px solid rgba(201,168,76,0.3)" }}>
            {customer.avatarUrl
              ? <img src={customer.avatarUrl} alt="" className="w-full h-full object-cover" />
              : initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-fg">{customer.name}</h1>
              {customer.isBlocked && (
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[color:var(--danger-tint)] text-[color:var(--danger)]">Blocked</span>
              )}
              {!customer.emailVerifiedAt && (
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[color:var(--warning-tint)] text-[color:var(--warning)]">Unverified</span>
              )}
            </div>
            <p className="text-[color:var(--fg-muted)] text-sm">{customer.email}</p>
            {customer.phone && <p className="text-[color:var(--fg-subtle)] text-sm">{customer.phone}</p>}
            <p className="text-[11px] text-[color:var(--fg-subtle)] mt-1">
              Joined {new Date(customer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <button
            onClick={toggleBlock}
            disabled={toggling}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50"
            style={{
              background: customer.isBlocked ? "var(--canvas)" : "var(--danger-tint)",
              color: customer.isBlocked ? "var(--fg)" : "var(--danger)",
              borderColor: customer.isBlocked ? "var(--canvas)" : "var(--danger)",
            }}
          >
            {toggling ? "Updating…" : customer.isBlocked ? "Unblock Customer" : "Block Customer"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Orders", value: customer._count.orders.toString(), icon: "receipt_long", color: "var(--accent)" },
            { label: "Total Spent", value: `৳${totalSpend.toLocaleString()}`, icon: "payments", color: "var(--accent)" },
            { label: "Loyalty Points", value: customer.loyaltyPoints.toLocaleString(), icon: "stars", color: "var(--accent)" },
            { label: "Reviews", value: customer._count.reviews.toString(), icon: "rate_review", color: "var(--fg-muted)" },
          ].map((s) => (
            <div key={s.label} className="bg-surface rounded-2xl border border-[color:var(--line)] p-5">
              <span className="material-symbols-outlined text-[22px] mb-2 block" style={{ color: s.color }}>{s.icon}</span>
              <p className="text-[26px] font-semibold text-fg leading-none">{s.value}</p>
              <p className="text-[11px] text-[color:var(--fg-subtle)] font-medium mt-1.5 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Orders */}
          <div className="md:col-span-2 bg-surface rounded-2xl border border-[color:var(--line)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[color:var(--surface)] flex items-center justify-between">
              <h2 className="font-semibold text-fg">Recent Orders</h2>
              <Link href={`/admin/orders?customer=${customer.id}`} className="text-xs text-[color:var(--accent)] font-semibold hover:underline">
                View all
              </Link>
            </div>
            {customer.orders.length === 0 ? (
              <div className="px-6 py-10 text-center text-[color:var(--fg-subtle)] text-sm">No orders yet.</div>
            ) : (
              <div className="divide-y divide-[color:var(--surface)]">
                {customer.orders.map((o) => (
                  <div key={o.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-fg">{o.orderNumber}</p>
                      <p className="text-xs text-[color:var(--fg-subtle)] mt-0.5 truncate">
                        {o.items.map((i) => `${i.productNameSnapshot} ×${i.quantity}`).join(", ")}
                      </p>
                      <p className="text-[11px] text-[color:var(--fg-subtle)] mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-fg">৳{Number(o.total).toLocaleString()}</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_CHIP[o.status] ?? "bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)]"}`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Addresses */}
          <div className="bg-surface rounded-2xl border border-[color:var(--line)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[color:var(--surface)]">
              <h2 className="font-semibold text-fg">Saved Addresses</h2>
            </div>
            {customer.addresses.length === 0 ? (
              <div className="px-5 py-10 text-center text-[color:var(--fg-subtle)] text-sm">No addresses saved.</div>
            ) : (
              <div className="divide-y divide-[color:var(--surface)]">
                {customer.addresses.map((a) => (
                  <div key={a.id} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-fg">{a.fullName}</p>
                      {a.isDefault && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(89,81,180,0.1)", color: "var(--accent)" }}>Default</span>
                      )}
                    </div>
                    <p className="text-xs text-[color:var(--fg-subtle)]">{a.line1}, {a.city}</p>
                    <p className="text-xs text-[color:var(--fg-subtle)]">{a.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
