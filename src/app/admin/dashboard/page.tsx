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
  pending_payment: "bg-[#ffdad6] text-[#ba1a1a]",
  confirmed: "bg-[#e4dfff] text-[#41379b]",
  packed: "bg-[#e4dfff] text-[#41379b]",
  shipped: "bg-[#9f97ff]/20 text-[#33288d]",
  delivered: "bg-[#e5e2e1] text-[#474746]",
  cancelled: "bg-[#ffdad6] text-[#ba1a1a]",
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
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            <KpiCard
              icon="payments" iconBg="bg-[#9f97ff]/20" iconColor="text-[#5951b4]"
              label="Revenue" value={`৳${data.kpis.todayRevenue.toLocaleString()}`}
              trend={data.kpis.todayRevenueDelta} trendLabel="from last week"
            />
            <KpiCard
              icon="local_mall" iconBg="bg-[#e8e8e8]" iconColor="text-black"
              label="Orders" value={data.kpis.totalOrders.toLocaleString()}
              trend={data.kpis.ordersDelta} trendLabel="from last week"
            />
            <KpiCard
              icon="person" iconBg="bg-[#e8e8e8]" iconColor="text-black"
              label="Customers" value={data.kpis.newCustomers.toLocaleString()}
              trend={0} trendLabel="Stable activity" noTrend
            />
            <KpiCard
              icon="pending_actions" iconBg="bg-[#ffdad6]/20" iconColor="text-[#ba1a1a]"
              label="Pending" value={data.kpis.pendingOrders.toLocaleString()}
              trend={0} trendLabel="Immediate action required" urgent
            />
          </section>

          {/* Chart + Low Stock */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Bar Chart */}
            <div className="lg:col-span-2 bg-white p-5 md:p-8 rounded-2xl border border-[#e8e8e8]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="font-['Hanken_Grotesk'] font-semibold text-[20px] text-black">Revenue Trend</h4>
                  <p className="text-[#444748] text-sm mt-1">Last 7 days performance</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#5951b4]" />
                  <span className="text-[#444748] text-xs">Gross Sales</span>
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
                        className={`w-full rounded-t-lg transition-all cursor-pointer hover:opacity-80 ${isHighest ? "bg-[#5951b4]" : "bg-[#eeeeee] border border-[#c4c7c7]"}`}
                        style={{ height: `${pct}%` }}
                        title={`৳${d.revenue.toLocaleString()}`}
                      />
                      <span className={`text-[11px] ${isHighest ? "font-bold text-black" : "text-[#444748]"}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Low Stock */}
            <div className="bg-white p-5 md:p-8 rounded-2xl border border-[#e8e8e8] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-['Hanken_Grotesk'] font-semibold text-[20px] text-black">Low Stock</h4>
                <span className="bg-[#ba1a1a] text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                  Action Needed
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {(data.lowStockVariants ?? []).length === 0 ? (
                  <p className="text-[#747878] text-sm text-center py-8">All stocked up!</p>
                ) : (
                  (data.lowStockVariants ?? []).map((v) => (
                    <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#c4c7c7] hover:bg-[#f4f3f3] transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded bg-[#eeeeee] flex-shrink-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#444748] text-lg">inventory_2</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-black truncate">
                          {v.product.name}
                          {(v.color || v.size) && <span className="text-[#747878] font-normal"> · {[v.color, v.size].filter(Boolean).join(" / ")}</span>}
                        </p>
                        <p className="text-xs text-[#ba1a1a]">{v.stockQuantity === 0 ? "Out of stock" : `Only ${v.stockQuantity} left in stock`}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link href="/admin/products" className="mt-6 w-full py-3 border border-black text-black text-sm font-semibold rounded-lg hover:bg-black hover:text-white transition-all text-center block">
                Manage Inventory
              </Link>
            </div>
          </section>

          {/* Recent Orders Table */}
          <section className="bg-white rounded-xl border border-[#c4c7c7] overflow-hidden">
            <div className="p-8 border-b border-[#c4c7c7] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-['Hanken_Grotesk'] font-semibold text-[20px] text-black">Recent Orders</h4>
                <p className="text-[#444748] text-sm mt-1">Showing latest activity</p>
              </div>
              <div className="flex gap-2">
                <Link href="/admin/orders" className="px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity">
                  View All
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#f4f3f3] border-b border-[#c4c7c7]">
                    {["Order ID", "Customer", "Date", "Total", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-8 py-4 text-[11px] font-semibold text-[#444748] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e2e2]">
                  {(data.recentOrders ?? []).map((o) => {
                    const initials = (o.user?.name ?? "G").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={o.id} className="hover:bg-[#f4f3f3] transition-colors group">
                        <td className="px-8 py-5 text-sm font-semibold text-black">#{o.orderNumber}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#e4dfff] text-[#5951b4] flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {initials}
                            </div>
                            <span className="text-sm text-[#1a1c1c]">{o.user?.name ?? "Guest"}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm text-[#444748]">
                          {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-black">৳{Number(o.total).toLocaleString()}</td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${STATUS_PILL[o.status] ?? "bg-[#eeeeee] text-[#444748]"}`}>
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <Link href={`/admin/orders`} className="text-[#444748] hover:text-black">
                            <span className="material-symbols-outlined text-xl">more_horiz</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {(data.recentOrders ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-[#747878] text-sm">No orders yet.</td>
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
      className="card-3d bg-white p-5 md:p-6 rounded-2xl flex flex-col justify-between"
      style={{
        border: "1px solid #e8e8e8",
        boxShadow: "0 2px 12px rgba(11,11,20,0.06), 0 1px 3px rgba(11,11,20,0.04)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold text-[#747878] uppercase tracking-[0.18em]">{label}</p>
          <h3 className="font-['Playfair_Display'] text-[28px] md:text-[32px] font-semibold text-black mt-1 leading-tight">{value}</h3>
        </div>
        <div className={`${iconBg} p-3 rounded-xl`}>
          <span className={`material-symbols-outlined ${iconColor} text-2xl`}
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
            {icon}
          </span>
        </div>
      </div>
      <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${urgent ? "text-[#ba1a1a]" : noTrend ? "text-[#444748]" : up ? "text-[#41379b]" : "text-[#ba1a1a]"}`}>
        {!noTrend && !urgent && (
          <span className="material-symbols-outlined text-base">{up ? "trending_up" : "trending_down"}</span>
        )}
        {urgent && <span className="material-symbols-outlined text-base">warning</span>}
        <span>{noTrend || urgent ? trendLabel : `${up ? "+" : ""}${trend}% ${trendLabel}`}</span>
      </div>
    </div>
  );
}
