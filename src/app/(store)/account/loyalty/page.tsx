"use client";

import { useEffect, useState } from "react";
import AuraLoadingScreen from "@/components/ui/AuraLoadingScreen";

interface Transaction { id: string; points: number; type: string; description: string; orderId?: string; createdAt: string; }

const TYPE_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  earn:   { icon: "add_circle", color: "var(--success)", bg: "var(--success-tint)" },
  redeem: { icon: "remove_circle", color: "var(--accent)", bg: "var(--accent-tint)" },
  bonus:  { icon: "star", color: "var(--accent)", bg: "var(--accent-tint)" },
  expire: { icon: "timer_off", color: "var(--danger)", bg: "var(--danger-tint)" },
};

export default function LoyaltyPage() {
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ag_authed");
    fetch("/api/account/loyalty", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { points: 0, transactions: [] })
      .then(d => { setPoints(d.points ?? 0); setTransactions(d.transactions ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const taka = Math.floor(points / 10); // 10 points = ৳1

  if (loading) return <AuraLoadingScreen fullScreen />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="dd-display text-[28px] text-fg">Loyalty Points</h2>
        <p className="text-fg-muted text-sm mt-1">Earn points with every purchase. Redeem them at checkout.</p>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl overflow-hidden bg-surface border border-accent/25">
        <div className="p-6 md:p-8">
          <p className="dd-eyebrow text-accent mb-2">Your Balance</p>
          <div className="flex items-end gap-3">
            <span className="dd-display text-6xl text-fg">{points.toLocaleString()}</span>
            <span className="text-lg mb-2 text-fg-subtle">pts</span>
          </div>
          <p className="text-sm mt-2 text-fg-muted">
            Worth <span className="font-medium text-fg">৳{taka.toLocaleString()}</span> at checkout
          </p>
        </div>
        <div className="grid grid-cols-3 border-t border-line">
          {[
            { label: "Points per ৳10", value: "1 pt" },
            { label: "Redeem rate", value: "10 pts = ৳1" },
            { label: "Min redeem", value: "100 pts" },
          ].map(item => (
            <div key={item.label} className="px-4 py-3 text-center">
              <p className="text-xs font-medium text-fg">{item.value}</p>
              <p className="text-[9px] uppercase tracking-wider mt-0.5 text-fg-subtle">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How to earn */}
      <div className="bg-surface rounded-2xl border border-line p-5">
        <h3 className="font-medium text-sm text-fg mb-4">How to Earn</h3>
        <div className="space-y-3">
          {[
            { icon: "shopping_bag", label: "Make a purchase", desc: "1 point for every ৳10 spent" },
            { icon: "rate_review", label: "Write a review", desc: "50 bonus points per approved review" },
            { icon: "cake", label: "Birthday bonus", desc: "100 points on your birthday month" },
          ].map(item => (
            <div key={item.icon} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-accent-tint">
                <span className="material-symbols-outlined text-base text-accent">{item.icon}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-fg">{item.label}</p>
                <p className="text-xs text-fg-subtle">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h3 className="font-medium text-sm text-fg mb-3">Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-line p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-fg-subtle block mb-2">history</span>
            <p className="text-sm text-fg-subtle">No transactions yet. Make your first purchase to earn points!</p>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-line divide-y divide-line">
            {transactions.map((tx) => {
              const style = TYPE_STYLE[tx.type] ?? TYPE_STYLE.earn;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: style.bg }}>
                    <span className="material-symbols-outlined text-[16px]" style={{ color: style.color }}>{style.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg truncate">{tx.description}</p>
                    <p className="text-[11px] text-fg-subtle">{new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <span className="text-sm font-medium shrink-0" style={{ color: tx.type === "earn" || tx.type === "bonus" ? "var(--success)" : tx.type === "redeem" ? "var(--accent)" : "var(--danger)" }}>
                    {tx.type === "redeem" || tx.type === "expire" ? "-" : "+"}{Math.abs(tx.points)} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
