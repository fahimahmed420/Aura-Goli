"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Link from "next/link";

interface Customer {
  id: string; name: string; email: string; isBlocked: boolean; createdAt: string;
  _count: { orders: number };
  orders: { total: number }[];
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("adminToken");
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/customers?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setCustomers(data.customers ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }, [page, q]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  async function toggleBlock(customerId: string, currentlyBlocked: boolean) {
    setToggling(customerId);
    const token = localStorage.getItem("adminToken");
    await fetch(`/api/admin/customers/${customerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isBlocked: !currentlyBlocked }),
    });
    fetchCustomers();
    setToggling(null);
  }

  const totalPages = Math.ceil(total / 20);
  const totalSpend = customers.reduce((s, c) => s + c.orders.reduce((a, o) => a + Number(o.total), 0), 0);
  const activeCount = customers.filter((c) => !c.isBlocked).length;

  return (
    <AdminShell title="Customers">
      <div className="space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Customers", value: total.toLocaleString(), sub: "+14% this month", color: "text-[color:var(--accent)]" },
            { label: "Active Now", value: activeCount.toString(), sub: "on this page", color: "text-[color:var(--fg-muted)]" },
            { label: "Avg. LTV", value: customers.length ? `৳${Math.round(totalSpend / customers.length).toLocaleString()}` : "৳0", sub: "Lifetime Value", color: "text-[color:var(--fg-muted)]" },
            { label: "Blocked", value: customers.filter((c) => c.isBlocked).length.toString(), sub: "-0.3% rate", color: "text-[color:var(--danger)]" },
          ].map((s) => (
            <div key={s.label} className="p-6 bg-[color:var(--surface)] rounded-2xl border border-[color:var(--line)]/30">
              <p className="text-[11px] text-[color:var(--fg-muted)] font-semibold mb-1 uppercase tracking-wider">{s.label}</p>
              <h3 className="text-[24px] font-semibold text-fg">{s.value}</h3>
              <p className={`text-xs font-medium mt-2 ${s.color}`}>{s.sub}</p>
            </div>
          ))}
        </section>

        {/* Search + header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-[32px] font-semibold text-fg">Customers</h2>
            <p className="text-[color:var(--fg-muted)] text-sm">Manage and monitor your registered customer base.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-muted)] text-[18px]">search</span>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 bg-surface border border-[color:var(--fg-subtle)] rounded-lg w-full md:w-64 focus:outline-none focus:border-[color:var(--accent)] transition-all text-[14px]"
                placeholder="Search customers..."
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface rounded-2xl border border-[color:var(--line)] overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-12 px-6 py-3 bg-[color:var(--surface)] border-b border-[color:var(--fg-subtle)] text-[color:var(--fg-muted)] text-[11px] font-semibold uppercase tracking-wider">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Total Orders</div>
            <div className="col-span-2">Total Spent</div>
            <div className="col-span-2">Join Date</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* Table body */}
          <div className="divide-y divide-[color:var(--fg-subtle)]">
            {loading ? (
              <div className="py-16 text-center">
                <div className="w-6 h-6 border-2 border-line-strong border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : customers.length === 0 ? (
              <div className="py-16 text-center text-[color:var(--fg-subtle)] text-sm">No customers found.</div>
            ) : customers.map((c) => {
              const lifetimeSpend = c.orders.reduce((s, o) => s + Number(o.total), 0);
              const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={c.id} className="grid grid-cols-12 px-6 py-5 hover:bg-[color:var(--surface)] transition-colors items-center">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[color:var(--accent-tint)] flex items-center justify-center text-[color:var(--accent)] font-bold text-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-[18px] text-fg leading-tight">{c.name}</p>
                      <p className="text-xs text-[color:var(--fg-muted)]">{c.email}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-[color:var(--fg)]">{c._count.orders} Orders</div>
                  <div className="col-span-2 text-[13px] font-semibold text-fg">৳{lifetimeSpend.toLocaleString()}</div>
                  <div className="col-span-2 text-sm text-[color:var(--fg-muted)]">
                    {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div className="col-span-1">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      !c.isBlocked ? "bg-[color:var(--accent-tint)] text-[color:var(--accent)]" : "bg-[color:var(--line)] text-[color:var(--fg-muted)]"
                    }`}>
                      {c.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <Link href={`/admin/customers/${c.id}`}
                      className="p-2 text-[color:var(--fg-muted)] hover:text-fg transition-colors inline-flex">
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="p-4 bg-[color:var(--surface)] flex items-center justify-between border-t border-[color:var(--fg-subtle)]">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 text-[color:var(--fg-muted)] text-[13px] font-semibold hover:text-fg disabled:opacity-30">Previous</button>
            <div className="flex gap-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded text-[13px] font-semibold transition-colors ${page === n ? "bg-accent text-accent-fg" : "hover:bg-[color:var(--line)]"}`}>
                  {n}
                </button>
              ))}
              {totalPages > 5 && <span className="px-2 self-center text-[color:var(--fg-muted)]">...</span>}
            </div>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-4 py-2 text-[color:var(--fg-muted)] text-[13px] font-semibold hover:text-fg disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
