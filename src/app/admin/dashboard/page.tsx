"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";

interface DashboardData {
  kpis: {
    todayRevenue: number; todayRevenueDelta: number;
    totalOrders: number; ordersDelta: number;
    newCustomers: number; customersDelta: number;
    pendingOrders: number;
  };
  recentOrders: {
    id: string; orderNumber: string; status: string; total: number; createdAt: string;
    user: { name: string; email: string } | null;
  }[];
  lowStockVariants: {
    id: string; color: string | null; size: string | null; sku: string; stockQuantity: number;
    product: { id: string; name: string };
  }[];
  chartData: { date: string; revenue: number }[];
}

const STATUS_PILL: Record<string, string> = {
  pending_payment: "bg-[color:var(--danger-tint)] text-[color:var(--danger)]",
  confirmed: "bg-[color:var(--accent-tint)] text-[color:var(--accent)]",
  packed: "bg-[color:var(--accent-tint)] text-[color:var(--accent)]",
  shipped: "bg-[color:var(--accent)]/20 text-[color:var(--accent)]",
  delivered: "bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)]",
  cancelled: "bg-[color:var(--danger-tint)] text-[color:var(--danger)]",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    fetch("/api/admin/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const maxRevenue = data?.chartData?.length ? Math.max(...data.chartData.map((d) => d.revenue), 1) : 1;

  return (
    <AdminShell title="Overview">
      {loading || !data?.kpis ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-line-strong border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            <KpiCard
              icon="payments" iconBg="bg-[color:var(--accent)]/20" iconColor="text-[color:var(--accent)]"
              label="Revenue" value={`৳${data.kpis.todayRevenue.toLocaleString()}`}
              trend={data.kpis.todayRevenueDelta} trendLabel="from last week"
            />
            <KpiCard
              icon="local_mall" iconBg="bg-[color:var(--line)]" iconColor="text-fg"
              label="Orders" value={data.kpis.totalOrders.toLocaleString()}
              trend={data.kpis.ordersDelta} trendLabel="from last week"
            />
            <KpiCard
              icon="person" iconBg="bg-[color:var(--line)]" iconColor="text-fg"
              label="Customers" value={data.kpis.newCustomers.toLocaleString()}
              trend={0} trendLabel="Stable activity" noTrend
            />
            <KpiCard
              icon="pending_actions" iconBg="bg-[color:var(--danger-tint)]/20" iconColor="text-[color:var(--danger)]"
              label="Pending" value={data.kpis.pendingOrders.toLocaleString()}
              trend={0} trendLabel="Immediate action required" urgent
            />
          </section>

          {/* Chart + Low Stock */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Bar Chart */}
            <div className="lg:col-span-2 bg-surface p-5 md:p-8 rounded-2xl border border-[color:var(--line)]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="font-semibold text-[20px] text-fg">Revenue Trend</h4>
                  <p className="text-[color:var(--fg-muted)] text-sm mt-1">Last 7 days performance</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[color:var(--accent)]" />
                  <span className="text-[color:var(--fg-muted)] text-xs">Gross Sales</span>
                </div>
              </div>
              <div className="h-56 flex items-end justify-between gap-3">
                {(data.chartData ?? []).slice(-7).map((d, i) => {
                  const pct = Math.max((d.revenue / maxRevenue) * 100, 2);
                  const label = new Date(d.date).toLocaleDateString("en-GB", { weekday: "short" });
                  const isHighest = d.revenue === Math.max(...(data.chartData ?? []).slice(-7).map((x) => x.revenue));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div
                        className={`w-full rounded-t-lg transition-all cursor-pointer hover:opacity-80 ${isHighest ? "bg-[color:var(--accent)]" : "bg-[color:var(--surface-raised)] border border-[color:var(--fg-subtle)]"}`}
                        style={{ height: `${pct}%` }}
                        title={`৳${d.revenue.toLocaleString()}`}
                      />
                      <span className={`text-[11px] ${isHighest ? "font-bold text-fg" : "text-[color:var(--fg-muted)]"}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Low Stock */}
            <div className="bg-surface p-5 md:p-8 rounded-2xl border border-[color:var(--line)] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-semibold text-[20px] text-fg">Low Stock</h4>
                <span className="bg-[color:var(--danger)] text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                  Action Needed
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {(data.lowStockVariants ?? []).length === 0 ? (
                  <p className="text-[color:var(--fg-subtle)] text-sm text-center py-8">All stocked up!</p>
                ) : (
                  (data.lowStockVariants ?? []).map((v) => (
                    <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--fg-subtle)] hover:bg-[color:var(--surface)] transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded bg-[color:var(--surface-raised)] flex-shrink-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[color:var(--fg-muted)] text-lg">inventory_2</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-fg truncate">
                          {v.product.name}
                          {(v.color || v.size) && <span className="text-[color:var(--fg-subtle)] font-normal"> · {[v.color, v.size].filter(Boolean).join(" / ")}</span>}
                        </p>
                        <p className="text-xs text-[color:var(--danger)]">{v.stockQuantity === 0 ? "Out of stock" : `Only ${v.stockQuantity} left in stock`}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link href="/admin/products" className="mt-6 w-full py-3 border border-line-strong text-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-all text-center block">
                Manage Inventory
              </Link>
            </div>
          </section>

          {/* Recent Orders Table */}
          <section className="bg-surface rounded-xl border border-[color:var(--fg-subtle)] overflow-hidden">
            <div className="p-8 border-b border-[color:var(--fg-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-[20px] text-fg">Recent Orders</h4>
                <p className="text-[color:var(--fg-muted)] text-sm mt-1">Showing latest activity</p>
              </div>
              <div className="flex gap-2">
                <Link href="/admin/orders" className="px-4 py-2 bg-accent text-accent-fg rounded-lg text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity">
                  View All
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[color:var(--surface)] border-b border-[color:var(--fg-subtle)]">
                    {["Order ID", "Customer", "Date", "Total", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-8 py-4 text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line-strong)]">
                  {(data.recentOrders ?? []).map((o) => {
                    const initials = (o.user?.name ?? "G").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={o.id} className="hover:bg-[color:var(--surface)] transition-colors group">
                        <td className="px-8 py-5 text-sm font-semibold text-fg">#{o.orderNumber}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {initials}
                            </div>
                            <span className="text-sm text-[color:var(--fg)]">{o.user?.name ?? "Guest"}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm text-[color:var(--fg-muted)]">
                          {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-fg">৳{Number(o.total).toLocaleString()}</td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${STATUS_PILL[o.status] ?? "bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)]"}`}>
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <Link href={`/admin/orders`} className="text-[color:var(--fg-muted)] hover:text-fg">
                            <span className="material-symbols-outlined text-xl">more_horiz</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {(data.recentOrders ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-[color:var(--fg-subtle)] text-sm">No orders yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function KpiCard({
  icon, iconBg, iconColor, label, value, trend, trendLabel, noTrend, urgent,
}: {
  icon: string; iconBg: string; iconColor: string;
  label: string; value: string;
  trend: number; trendLabel: string;
  noTrend?: boolean; urgent?: boolean;
}) {
  const up = trend >= 0;
  return (
    <div
      className="card-3d bg-surface p-5 md:p-6 rounded-2xl flex flex-col justify-between"
      style={{
        border: "1px solid var(--line)",
        boxShadow: "0 2px 12px rgba(11,11,20,0.06), 0 1px 3px rgba(11,11,20,0.04)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold text-[color:var(--fg-subtle)] uppercase tracking-[0.18em]">{label}</p>
          <h3 className="text-[28px] md:text-[32px] font-semibold text-fg mt-1 leading-tight">{value}</h3>
        </div>
        <div className={`${iconBg} p-3 rounded-xl`}>
          <span className={`material-symbols-outlined ${iconColor} text-2xl`}
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
            {icon}
          </span>
        </div>
      </div>
      <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${urgent ? "text-[color:var(--danger)]" : noTrend ? "text-[color:var(--fg-muted)]" : up ? "text-[color:var(--accent)]" : "text-[color:var(--danger)]"}`}>
        {!noTrend && !urgent && (
          <span className="material-symbols-outlined text-base">{up ? "trending_up" : "trending_down"}</span>
        )}
        {urgent && <span className="material-symbols-outlined text-base">warning</span>}
        <span>{noTrend || urgent ? trendLabel : `${up ? "+" : ""}${trend}% ${trendLabel}`}</span>
      </div>
    </div>
  );
}
