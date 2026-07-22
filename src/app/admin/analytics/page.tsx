"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface AnalyticsData {
  summary: {
    totalSales: number; netOrders: number; avgOrderValue: number;
    revenueDelta: number; ordersDelta: number; avgDelta: number;
  };
  chartData: { month: string; curr: number; prev: number }[];
  totalCustomers: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data?.summary || !data?.chartData) {
    return (
      <AdminShell title="Reports">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-line-strong border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  const { summary, chartData, totalCustomers } = data;
  const maxVal = Math.max(...chartData.map((d) => Math.max(d.curr, d.prev)), 1);

  const SUMMARY_CARDS = [
    { label: "Total Sales (30d)", value: `৳${summary.totalSales.toLocaleString()}`, delta: summary.revenueDelta, suffix: "% vs prev 30d" },
    { label: "Net Orders (30d)", value: summary.netOrders.toLocaleString(), delta: summary.ordersDelta, suffix: "% vs prev 30d" },
    { label: "Avg. Order Value", value: `৳${summary.avgOrderValue.toLocaleString()}`, delta: summary.avgDelta, suffix: "% vs prev 30d" },
    { label: "Total Customers", value: totalCustomers.toLocaleString(), delta: 0, suffix: "registered", noSign: true },
  ];

  return (
    <AdminShell title="Reports">
      <div className="space-y-8 max-w-6xl">
        {/* Summary cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY_CARDS.map((s) => (
            <div key={s.label} className="bg-surface rounded-2xl border border-[color:var(--line)] p-6">
              <p className="text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider">{s.label}</p>
              <h3 className="text-[28px] font-semibold text-fg mt-1">{s.value}</h3>
              <p className={`text-[12px] font-semibold flex items-center gap-1 mt-2 ${s.noSign ? "text-[color:var(--fg-muted)]" : s.delta >= 0 ? "text-[color:var(--accent)]" : "text-[color:var(--danger)]"}`}>
                {!s.noSign && (
                  <span className="material-symbols-outlined text-[14px]">{s.delta >= 0 ? "trending_up" : "trending_down"}</span>
                )}
                {s.noSign ? s.suffix : `${s.delta >= 0 ? "+" : ""}${s.delta}${s.suffix}`}
              </p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart */}
          <section className="lg:col-span-2 bg-surface rounded-2xl border border-[color:var(--line)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-fg text-[18px]">Sales Growth</h3>
                <p className="text-[color:var(--fg-muted)] text-[13px]">Current vs. previous year — same months</p>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-black inline-block" /> This year</span>
                <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-[color:var(--fg-subtle)] inline-block border-dashed" style={{ borderTopStyle: "dashed", borderTopWidth: 2 }} /> Last year</span>
              </div>
            </div>

            {chartData.every((d) => d.curr === 0 && d.prev === 0) ? (
              <div className="h-52 flex items-center justify-center text-[color:var(--fg-subtle)] text-sm">No sales data yet.</div>
            ) : (
              <div className="relative h-52">
                <svg viewBox="0 0 540 200" className="w-full h-full overflow-visible">
                  {[0, 50, 100, 150, 200].map((y) => (
                    <line key={y} x1="0" y1={y} x2="540" y2={y} stroke="var(--surface-raised)" strokeWidth="1" />
                  ))}
                  <polyline
                    points={chartData.map((d, i) => `${i * (540 / Math.max(chartData.length - 1, 1))},${200 - (d.prev / maxVal) * 190}`).join(" ")}
                    fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeDasharray="6,4"
                  />
                  <polyline
                    points={chartData.map((d, i) => `${i * (540 / Math.max(chartData.length - 1, 1))},${200 - (d.curr / maxVal) * 190}`).join(" ")}
                    fill="none" stroke="var(--accent)" strokeWidth="2.5"
                  />
                  {chartData.map((d, i) => (
                    <circle key={i} cx={i * (540 / Math.max(chartData.length - 1, 1))} cy={200 - (d.curr / maxVal) * 190} r="4" fill="var(--accent)">
                      <title>৳{d.curr.toLocaleString()}</title>
                    </circle>
                  ))}
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                  {chartData.map((d) => (
                    <span key={d.month} className="text-[11px] text-[color:var(--fg-muted)]">{d.month}</span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Quick stats */}
          <section className="space-y-4">
            <div className="bg-surface rounded-2xl border border-[color:var(--line)] p-6">
              <h3 className="font-semibold text-fg text-[16px] mb-4">Period Snapshot</h3>
              <div className="space-y-3">
                {[
                  { label: "Revenue (30d)", value: `৳${summary.totalSales.toLocaleString()}` },
                  { label: "Orders (30d)", value: summary.netOrders.toLocaleString() },
                  { label: "Avg. Order", value: `৳${summary.avgOrderValue.toLocaleString()}` },
                  { label: "Customers", value: totalCustomers.toLocaleString() },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between py-2 border-b border-[color:var(--surface-raised)] last:border-none">
                    <span className="text-[13px] text-[color:var(--fg-muted)]">{r.label}</span>
                    <span className="text-[14px] font-semibold text-fg">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black rounded-xl p-6 text-white">
              <h3 className="font-semibold text-[16px] mb-2">Revenue Trend</h3>
              <p className={`text-[28px] font-semibold ${summary.revenueDelta >= 0 ? "text-[color:var(--accent)]" : "text-[color:var(--danger-tint)]"}`}>
                {summary.revenueDelta >= 0 ? "+" : ""}{summary.revenueDelta}%
              </p>
              <p className="text-white/60 text-[13px] mt-1">vs previous 30 days</p>
            </div>
          </section>
        </div>

        {/* Monthly bar chart */}
        <section className="bg-surface rounded-2xl border border-[color:var(--line)] p-6">
          <h3 className="font-semibold text-fg text-[18px] mb-6">Monthly Revenue Breakdown</h3>
          <div className="h-32 flex items-end gap-3">
            {chartData.map((d, i) => {
              const pct = maxVal > 0 ? (d.curr / maxVal) * 100 : 0;
              const isHighest = d.curr === Math.max(...chartData.map((x) => x.curr));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div title={`৳${d.curr.toLocaleString()}`}
                    className={`w-full rounded-t-md transition-all ${isHighest ? "bg-[color:var(--accent)]" : "bg-[color:var(--surface-raised)]"}`}
                    style={{ height: `${Math.max(pct, 3)}%` }} />
                  <span className="text-[11px] text-[color:var(--fg-muted)]">{d.month}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
