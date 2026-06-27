"use client";

import { useEffect, useState } from "react";

interface Transaction { id: string; points: number; type: string; description: string; orderId?: string; createdAt: string; }

const TYPE_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  earn:   { icon: "add_circle", color: "#1a7f37", bg: "#d4f0d9" },
  redeem: { icon: "remove_circle", color: "#c9a84c", bg: "rgba(201,168,76,0.1)" },
  bonus:  { icon: "star", color: "#5951b4", bg: "#e4dfff" },
  expire: { icon: "timer_off", color: "#ba1a1a", bg: "#ffdad6" },
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-['Playfair_Display'] text-[28px] font-semibold text-black">Loyalty Points</h2>
        <p className="text-[#444748] text-sm mt-1">Earn points with every purchase. Redeem them at checkout.</p>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#12103a" }}>
        <div className="p-6 md:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: "rgba(201,168,76,0.6)" }}>Your Balance</p>
          <div className="flex items-end gap-3">
            <span className="font-['Playfair_Display'] text-6xl font-bold" style={{ color: "#c9a84c" }}>{points.toLocaleString()}</span>
            <span className="text-lg mb-2" style={{ color: "rgba(250,247,240,0.5)" }}>pts</span>
          </div>
          <p className="text-sm mt-2" style={{ color: "rgba(250,247,240,0.5)" }}>
            Worth <span className="font-bold" style={{ color: "#faf7f0" }}>৳{taka.toLocaleString()}</span> at checkout
          </p>
        </div>
        <div className="grid grid-cols-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {[
            { label: "Points per ৳10", value: "1 pt" },
            { label: "Redeem rate", value: "10 pts = ৳1" },
            { label: "Min redeem", value: "100 pts" },
          ].map(item => (
            <div key={item.label} className="px-4 py-3 text-center">
              <p className="text-xs font-bold" style={{ color: "#faf7f0" }}>{item.value}</p>
              <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How to earn */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] p-5">
        <h3 className="font-semibold text-sm text-black mb-4">How to Earn</h3>
        <div className="space-y-3">
          {[
            { icon: "shopping_bag", label: "Make a purchase", desc: "1 point for every ৳10 spent" },
            { icon: "rate_review", label: "Write a review", desc: "50 bonus points per approved review" },
            { icon: "cake", label: "Birthday bonus", desc: "100 points on your birthday month" },
          ].map(item => (
            <div key={item.icon} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(201,168,76,0.08)" }}>
                <span className="material-symbols-outlined text-base" style={{ color: "#c9a84c" }}>{item.icon}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-black">{item.label}</p>
                <p className="text-xs text-[#747878]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h3 className="font-semibold text-sm text-black mb-3">Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-[#e8e8e8] block mb-2">history</span>
            <p className="text-sm text-[#747878]">No transactions yet. Make your first purchase to earn points!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] divide-y divide-[#f4f3f3]">
            {transactions.map((tx) => {
              const style = TYPE_STYLE[tx.type] ?? TYPE_STYLE.earn;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: style.bg }}>
                    <span className="material-symbols-outlined text-[16px]" style={{ color: style.color }}>{style.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-black truncate">{tx.description}</p>
                    <p className="text-[11px] text-[#c4c7c7]">{new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: tx.type === "earn" || tx.type === "bonus" ? "#1a7f37" : tx.type === "redeem" ? "#c9a84c" : "#ba1a1a" }}>
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
