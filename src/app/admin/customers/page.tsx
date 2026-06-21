"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";

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
            { label: "Total Customers", value: total.toLocaleString(), sub: "+14% this month", color: "text-[#5951b4]" },
            { label: "Active Now", value: activeCount.toString(), sub: "on this page", color: "text-[#444748]" },
            { label: "Avg. LTV", value: customers.length ? `৳${Math.round(totalSpend / customers.length).toLocaleString()}` : "৳0", sub: "Lifetime Value", color: "text-[#444748]" },
            { label: "Blocked", value: customers.filter((c) => c.isBlocked).length.toString(), sub: "-0.3% rate", color: "text-[#ba1a1a]" },
          ].map((s) => (
            <div key={s.label} className="p-6 bg-[#f4f3f3] rounded-2xl border border-[#e8e8e8]/30">
              <p className="text-[11px] text-[#444748] font-semibold mb-1 uppercase tracking-wider">{s.label}</p>
              <h3 className="font-['Playfair_Display'] text-[24px] font-semibold text-black">{s.value}</h3>
              <p className={`text-xs font-medium mt-2 ${s.color}`}>{s.sub}</p>
            </div>
          ))}
        </section>

        {/* Search + header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-['Playfair_Display'] text-[32px] font-semibold text-black">Customers</h2>
            <p className="text-[#444748] text-sm">Manage and monitor your registered customer base.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#444748] text-[18px]">search</span>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 bg-white border border-[#c4c7c7] rounded-lg w-full md:w-64 focus:outline-none focus:border-[#5951b4] transition-all text-[14px]"
                placeholder="Search customers..."
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-12 px-6 py-3 bg-[#f4f3f3] border-b border-[#c4c7c7] text-[#444748] text-[11px] font-semibold uppercase tracking-wider">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Total Orders</div>
            <div className="col-span-2">Total Spent</div>
            <div className="col-span-2">Join Date</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* Table body */}
          <div className="divide-y divide-[#c4c7c7]">
            {loading ? (
              <div className="py-16 text-center">
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : customers.length === 0 ? (
              <div className="py-16 text-center text-[#747878] text-sm">No customers found.</div>
            ) : customers.map((c) => {
              const lifetimeSpend = c.orders.reduce((s, o) => s + Number(o.total), 0);
              const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={c.id} className="grid grid-cols-12 px-6 py-5 hover:bg-[#f4f3f3] transition-colors items-center">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e4dfff] flex items-center justify-center text-[#5951b4] font-bold text-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-[18px] text-black leading-tight">{c.name}</p>
                      <p className="text-xs text-[#444748]">{c.email}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-[#1a1c1c]">{c._count.orders} Orders</div>
                  <div className="col-span-2 text-[13px] font-semibold text-black">৳{lifetimeSpend.toLocaleString()}</div>
                  <div className="col-span-2 text-sm text-[#444748]">
                    {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div className="col-span-1">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      !c.isBlocked ? "bg-[#e4dfff] text-[#140067]" : "bg-[#e8e8e8] text-[#444748]"
                    }`}>
                      {c.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => toggleBlock(c.id, c.isBlocked)}
                      disabled={toggling === c.id}
                      className="p-2 text-[#444748] hover:text-black transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="p-4 bg-[#f4f3f3] flex items-center justify-between border-t border-[#c4c7c7]">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 text-[#444748] text-[13px] font-semibold hover:text-black disabled:opacity-30">Previous</button>
            <div className="flex gap-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded text-[13px] font-semibold transition-colors ${page === n ? "bg-black text-white" : "hover:bg-[#e8e8e8]"}`}>
                  {n}
                </button>
              ))}
              {totalPages > 5 && <span className="px-2 self-center text-[#444748]">...</span>}
            </div>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-4 py-2 text-[#444748] text-[13px] font-semibold hover:text-black disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
