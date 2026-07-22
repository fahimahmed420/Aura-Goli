"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface FlashSale { id: string; name: string; bannerText: string; discountPercent: number; categorySlug: string | null; endsAt: string; isActive: boolean; createdAt: string; }
interface Category { id: string; name: string; slug: string; }

const EMPTY = { name: "", bannerText: "", discountPercent: "", categorySlug: "", endsAt: "" };

export default function AdminFlashSalePage() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("adminToken") : "";
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/flash-sale", { headers: headers() });
      const d = r.ok ? await r.json() : { sales: [] };
      setSales(d.sales ?? []);
    } catch { /* db not ready */ }
    setLoading(false);
    // headers() only reads localStorage, so it needs no dependency tracking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch_();
    fetch("/api/categories").then(r => r.json()).then(d => setCategories(d.categories ?? [])).catch(() => {});
  }, [fetch_]);

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
            <h1 className="text-2xl font-bold text-fg">Flash Sales</h1>
            <p className="text-sm text-[color:var(--fg-subtle)] mt-0.5">Only one sale can be active at a time.</p>
          </div>
          <button onClick={() => { setShowForm(true); setError(""); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "var(--surface)", color: "var(--fg)" }}>
            <span className="material-symbols-outlined text-[18px]">add</span> New Sale
          </button>
        </div>

        {/* Active sale indicator */}
        {active && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-5" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)" }}>
            <span className="material-symbols-outlined text-xl" style={{ color: "var(--accent)" }}>bolt</span>
            <div>
              <p className="text-sm font-bold text-fg">&ldquo;{active.name}&rdquo; is live right now</p>
              <p className="text-xs text-[color:var(--fg-subtle)]">
                {active.discountPercent}% off {active.categorySlug ? `"${active.categorySlug}" products` : "all products"} · Ends {new Date(active.endsAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        )}

        <div className="bg-surface rounded-2xl border border-[color:var(--line)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-[color:var(--fg-subtle)]">Loading…</div>
          ) : sales.length === 0 ? (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-[color:var(--line)] block mb-2">bolt</span>
              <p className="text-sm text-[color:var(--fg-subtle)]">No flash sales yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Name", "Category", "Discount", "Ends At", "Status", ""].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-subtle)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(s => {
                  const expired = new Date(s.endsAt) <= new Date();
                  const live = s.isActive && !expired;
                  return (
                    <tr key={s.id} className="border-t border-[color:var(--surface)] hover:bg-[color:var(--canvas)]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-fg">{s.name}</p>
                        <p className="text-xs text-[color:var(--fg-subtle)] mt-0.5 truncate max-w-[200px]">{s.bannerText}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-[color:var(--fg-muted)]">
                        {s.categorySlug
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(201,168,76,0.12)", color: "var(--warning)" }}>{s.categorySlug}</span>
                          : <span className="text-xs text-[color:var(--fg-subtle)]">All categories</span>
                        }
                      </td>
                      <td className="px-5 py-4 font-bold text-fg">{s.discountPercent}%</td>
                      <td className="px-5 py-4 text-[color:var(--fg-muted)]">
                        {new Date(s.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => !expired && toggle(s)} disabled={expired}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all disabled:opacity-40"
                          style={{
                            background: live ? "var(--success-tint)" : expired ? "var(--surface)" : "var(--danger-tint)",
                            color: live ? "var(--success)" : expired ? "var(--fg-subtle)" : "var(--danger)",
                          }}>
                          {live ? "Live" : expired ? "Expired" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => del(s.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[color:var(--danger-tint)] transition-colors">
                          <span className="material-symbols-outlined text-[18px] text-[color:var(--danger)]">delete</span>
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
          <aside className="relative w-full max-w-md bg-surface h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[color:var(--line)]">
              <h2 className="text-xl font-bold text-fg">New Flash Sale</h2>
              <button onClick={() => setShowForm(false)} className="text-[color:var(--fg-subtle)] hover:text-fg">
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-muted)] mb-1.5">{f.label}</label>
                  <input type={f.type ?? "text"} placeholder={f.placeholder} value={(form as Record<string,string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-[color:var(--line)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-line-strong" />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-muted)] mb-1.5">Apply To</label>
                <select value={form.categorySlug}
                  onChange={e => setForm(p => ({ ...p, categorySlug: e.target.value }))}
                  className="w-full border border-[color:var(--line)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-line-strong bg-surface">
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-[color:var(--fg-subtle)] mt-1.5">Leave as &ldquo;All Categories&rdquo; to apply discount sitewide.</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-muted)] mb-1.5">Ends At</label>
                <input type="datetime-local" value={form.endsAt}
                  onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))}
                  className="w-full border border-[color:var(--line)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-line-strong" />
              </div>
              {error && <p className="text-sm font-semibold text-[color:var(--danger)] bg-[color:var(--danger-tint)] px-4 py-2.5 rounded-xl">{error}</p>}
              <p className="text-xs text-[color:var(--fg-subtle)] p-3 rounded-xl bg-[color:var(--surface)]">
                ⚠️ Creating a new sale will automatically deactivate any currently live sale.
              </p>
            </div>
            <div className="p-6 border-t border-[color:var(--line)] flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-[color:var(--line)] text-sm font-semibold text-[color:var(--fg-muted)]">Cancel</button>
              <button onClick={create} disabled={saving || !form.name || !form.bannerText || !form.discountPercent || !form.endsAt}
                className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: "var(--surface)", color: "var(--fg)" }}>
                {saving ? "Creating…" : "Go Live"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
