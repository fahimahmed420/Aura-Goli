"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface FlashSale { id: string; name: string; bannerText: string; discountPercent: number; endsAt: string; isActive: boolean; createdAt: string; }

const EMPTY = { name: "", bannerText: "", discountPercent: "", endsAt: "" };

export default function AdminFlashSalePage() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = () => typeof window !== "undefined" ? localStorage.getItem("adminToken") : "";
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  async function fetch_() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/flash-sale", { headers: headers() });
      const d = r.ok ? await r.json() : { sales: [] };
      setSales(d.sales ?? []);
    } catch { /* db not ready */ }
    setLoading(false);
  }
  useEffect(() => { fetch_(); }, []);

  async function create() {
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/admin/flash-sale", { method: "POST", headers: headers(), body: JSON.stringify(form) });
      const d = r.ok || r.status < 500 ? await r.json() : { error: "Server error — run prisma db push" };
      if (!r.ok) { setError(d.error ?? "Failed"); setSaving(false); return; }
      setShowForm(false); setForm(EMPTY); fetch_();
    } catch { setError("Network error"); }
    setSaving(false);
  }

  async function toggle(s: FlashSale) {
    await fetch("/api/admin/flash-sale", { method: "PATCH", headers: headers(), body: JSON.stringify({ id: s.id, isActive: !s.isActive }) });
    fetch_();
  }

  async function del(id: string) {
    if (!confirm("Delete this flash sale?")) return;
    await fetch("/api/admin/flash-sale", { method: "DELETE", headers: headers(), body: JSON.stringify({ id }) });
    fetch_();
  }

  const active = sales.find(s => s.isActive && new Date(s.endsAt) > new Date());

  return (
    <AdminShell title="Flash Sales">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-bold text-black">Flash Sales</h1>
            <p className="text-sm text-[#747878] mt-0.5">Only one sale can be active at a time.</p>
          </div>
          <button onClick={() => { setShowForm(true); setError(""); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "#12103a", color: "#faf7f0" }}>
            <span className="material-symbols-outlined text-[18px]">add</span> New Sale
          </button>
        </div>

        {/* Active sale indicator */}
        {active && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-5" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)" }}>
            <span className="material-symbols-outlined text-xl" style={{ color: "#c9a84c" }}>bolt</span>
            <div>
              <p className="text-sm font-bold text-black">"{active.name}" is live right now</p>
              <p className="text-xs text-[#747878]">Ends {new Date(active.endsAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-[#747878]">Loading…</div>
          ) : sales.length === 0 ? (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-[#e8e8e8] block mb-2">bolt</span>
              <p className="text-sm text-[#747878]">No flash sales yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                  {["Name", "Discount", "Ends At", "Status", ""].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#747878]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(s => {
                  const expired = new Date(s.endsAt) <= new Date();
                  const live = s.isActive && !expired;
                  return (
                    <tr key={s.id} className="border-t border-[#f4f3f3] hover:bg-[#fafafa]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-black">{s.name}</p>
                        <p className="text-xs text-[#747878] mt-0.5 truncate max-w-[200px]">{s.bannerText}</p>
                      </td>
                      <td className="px-5 py-4 font-bold text-black">{s.discountPercent}%</td>
                      <td className="px-5 py-4 text-[#444748]">
                        {new Date(s.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => !expired && toggle(s)} disabled={expired}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all disabled:opacity-40"
                          style={{
                            background: live ? "#d4f0d9" : expired ? "#f4f3f3" : "#ffdad6",
                            color: live ? "#1a7f37" : expired ? "#747878" : "#ba1a1a",
                          }}>
                          {live ? "Live" : expired ? "Expired" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => del(s.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#ffdad6] transition-colors">
                          <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <aside className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#e8e8e8]">
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-black">New Flash Sale</h2>
              <button onClick={() => setShowForm(false)} className="text-[#747878] hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 p-6 space-y-5">
              {[
                { label: "Sale Name", key: "name", placeholder: "e.g. Eid Special Flash Sale" },
                { label: "Banner Text", key: "bannerText", placeholder: "e.g. Flash Sale! 20% off everything" },
                { label: "Discount %", key: "discountPercent", placeholder: "e.g. 20", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#444748] mb-1.5">{f.label}</label>
                  <input type={f.type ?? "text"} placeholder={f.placeholder} value={(form as Record<string,string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-[#e8e8e8] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black" />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#444748] mb-1.5">Ends At</label>
                <input type="datetime-local" value={form.endsAt}
                  onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))}
                  className="w-full border border-[#e8e8e8] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black" />
              </div>
              {error && <p className="text-sm font-semibold text-[#ba1a1a] bg-[#ffdad6] px-4 py-2.5 rounded-xl">{error}</p>}
              <p className="text-xs text-[#747878] p-3 rounded-xl bg-[#f4f3f3]">
                ⚠️ Creating a new sale will automatically deactivate any currently live sale.
              </p>
            </div>
            <div className="p-6 border-t border-[#e8e8e8] flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-[#e8e8e8] text-sm font-semibold text-[#444748]">Cancel</button>
              <button onClick={create} disabled={saving || !form.name || !form.bannerText || !form.discountPercent || !form.endsAt}
                className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: "#12103a", color: "#faf7f0" }}>
                {saving ? "Creating…" : "Go Live"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
