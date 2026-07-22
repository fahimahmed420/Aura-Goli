"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface Coupon {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrderAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  code: "", type: "flat" as "percent" | "flat", value: "",
  minOrderAmount: "", usageLimit: "", expiresAt: "", isActive: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("adminToken");
    const res = await fetch("/api/admin/coupons", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setCoupons(d.coupons ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(c: Coupon) {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minOrderAmount: c.minOrderAmount != null ? String(c.minOrderAmount) : "",
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
      isActive: c.isActive,
    });
    setError("");
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    const token = localStorage.getItem("adminToken");
    const body = {
      code: form.code,
      type: form.type,
      value: Number(form.value),
      minOrderAmount: form.minOrderAmount || null,
      usageLimit: form.usageLimit || null,
      expiresAt: form.expiresAt || null,
      isActive: form.isActive,
    };

    const url = editing ? `/api/admin/coupons/${editing.id}` : "/api/admin/coupons";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to save"); setSaving(false); return; }
    setShowForm(false);
    fetchCoupons();
    setSaving(false);
  }

  async function toggleActive(c: Coupon) {
    const token = localStorage.getItem("adminToken");
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    fetchCoupons();
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    setDeletingId(id);
    const token = localStorage.getItem("adminToken");
    await fetch(`/api/admin/coupons/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeletingId(null);
    fetchCoupons();
  }

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm((f) => ({ ...f, code }));
  }

  const filtered = coupons.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const isExpired = (c: Coupon) => c.expiresAt ? new Date(c.expiresAt) < new Date() : false;
  const isExhausted = (c: Coupon) => c.usageLimit != null && c.usageCount >= c.usageLimit;

  function statusLabel(c: Coupon) {
    if (!c.isActive) return { label: "Inactive", cls: "bg-[color:var(--surface)] text-[color:var(--fg-subtle)]" };
    if (isExpired(c)) return { label: "Expired", cls: "bg-[color:var(--danger-tint)] text-[color:var(--danger)]" };
    if (isExhausted(c)) return { label: "Exhausted", cls: "bg-[color:var(--danger-tint)] text-[color:var(--danger)]" };
    return { label: "Active", cls: "bg-[color:var(--success-tint)] text-[color:var(--success)]" };
  }

  return (
    <AdminShell title="Coupons">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-fg">Coupons</h1>
            <p className="text-sm text-[color:var(--fg-subtle)] mt-0.5">{coupons.length} coupon{coupons.length !== 1 ? "s" : ""} total</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--surface)", color: "var(--fg)" }}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Coupon
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[color:var(--fg-subtle)]">search</span>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code…"
            className="w-full pl-9 pr-4 py-2.5 border border-[color:var(--line)] rounded-xl text-sm outline-none focus:border-line-strong bg-surface"
          />
        </div>

        {/* Table */}
        <div className="bg-surface rounded-2xl border border-[color:var(--line)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[color:var(--fg-subtle)] text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="material-symbols-outlined text-5xl text-[color:var(--line)]">sell</span>
              <p className="text-[color:var(--fg-subtle)] text-sm">{search ? "No coupons match your search" : "No coupons yet. Create your first one."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Code", "Type", "Value", "Min Order", "Usage", "Expires", "Status", ""].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-subtle)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const { label, cls } = statusLabel(c);
                    return (
                      <tr key={c.id} className="border-t border-[color:var(--surface)] hover:bg-[color:var(--canvas)] transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-[13px] tracking-wider px-2.5 py-1 rounded-lg"
                            style={{ background: "var(--surface)", color: "var(--surface)" }}>
                            {c.code}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[color:var(--fg-muted)] capitalize">{c.type}</td>
                        <td className="px-5 py-4 font-semibold text-fg">
                          {c.type === "percent" ? `${Number(c.value)}%` : `৳${Number(c.value).toLocaleString()}`}
                        </td>
                        <td className="px-5 py-4 text-[color:var(--fg-muted)]">
                          {c.minOrderAmount ? `৳${Number(c.minOrderAmount).toLocaleString()}` : <span className="text-[color:var(--fg-subtle)]">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[color:var(--fg-muted)]">{c.usageCount}</span>
                          {c.usageLimit != null && (
                            <span className="text-[color:var(--fg-subtle)]"> / {c.usageLimit}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[color:var(--fg-muted)]">
                          {c.expiresAt
                            ? <span style={{ color: isExpired(c) ? "var(--danger)" : "var(--fg-muted)" }}>
                                {new Date(c.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            : <span className="text-[color:var(--fg-subtle)]">Never</span>}
                        </td>
                        <td className="px-5 py-4">
                          <button onClick={() => toggleActive(c)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${cls}`}>
                            {label}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(c)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[color:var(--surface)] transition-colors"
                              title="Edit">
                              <span className="material-symbols-outlined text-[18px] text-[color:var(--fg-muted)]">edit</span>
                            </button>
                            <button onClick={() => deleteCoupon(c.id)}
                              disabled={deletingId === c.id}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[color:var(--danger-tint)] transition-colors"
                              title="Delete">
                              <span className="material-symbols-outlined text-[18px] text-[color:var(--danger)]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Drawer ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <aside className="relative w-full max-w-md bg-surface h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[color:var(--line)]">
              <h2 className="text-xl font-bold text-fg">
                {editing ? "Edit Coupon" : "New Coupon"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[color:var(--fg-subtle)] hover:text-fg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 p-6 space-y-5">
              {/* Code */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-muted)] mb-1.5">
                  Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SAVE20"
                    className="flex-1 border border-[color:var(--line)] rounded-xl px-4 py-2.5 text-sm font-mono font-bold tracking-wider outline-none focus:border-line-strong"
                  />
                  <button onClick={generateCode}
                    className="px-3 py-2.5 rounded-xl border border-[color:var(--line)] text-[color:var(--fg-muted)] hover:bg-[color:var(--surface)] transition-colors text-xs font-semibold whitespace-nowrap">
                    Generate
                  </button>
                </div>
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-muted)] mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percent" | "flat" }))}
                    className="w-full border border-[color:var(--line)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-line-strong bg-surface">
                    <option value="flat">Flat (৳)</option>
                    <option value="percent">Percent (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-muted)] mb-1.5">
                    Value {form.type === "percent" ? "(%)" : "(৳)"}
                  </label>
                  <input
                    type="number" min="1" max={form.type === "percent" ? 100 : undefined}
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    placeholder={form.type === "percent" ? "e.g. 15" : "e.g. 100"}
                    className="w-full border border-[color:var(--line)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-line-strong"
                  />
                </div>
              </div>

              {/* Min order */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-muted)] mb-1.5">
                  Minimum Order Amount (৳) <span className="font-normal normal-case text-[color:var(--fg-subtle)]">optional</span>
                </label>
                <input
                  type="number" min="0"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                  placeholder="e.g. 500"
                  className="w-full border border-[color:var(--line)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-line-strong"
                />
              </div>

              {/* Usage limit */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-muted)] mb-1.5">
                  Usage Limit <span className="font-normal normal-case text-[color:var(--fg-subtle)]">optional — blank = unlimited</span>
                </label>
                <input
                  type="number" min="1"
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                  placeholder="e.g. 100"
                  className="w-full border border-[color:var(--line)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-line-strong"
                />
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[color:var(--fg-muted)] mb-1.5">
                  Expiry Date <span className="font-normal normal-case text-[color:var(--fg-subtle)]">optional — blank = never expires</span>
                </label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full border border-[color:var(--line)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-line-strong"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-[color:var(--line)]">
                <div>
                  <p className="text-sm font-semibold text-fg">Active</p>
                  <p className="text-xs text-[color:var(--fg-subtle)] mt-0.5">Customers can use this coupon</p>
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                  style={{ background: form.isActive ? "var(--surface)" : "var(--line)" }}>
                  <span className="absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-all"
                    style={{ left: form.isActive ? "26px" : "2px", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                </button>
              </div>

              {/* Preview */}
              {form.code && form.value && (
                <div className="p-4 rounded-xl border border-dashed border-[color:var(--accent)] bg-[color:var(--surface-raised)]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent)] mb-2">Preview</p>
                  <p className="text-sm text-[color:var(--fg-muted)]">
                    Code <span className="font-mono font-bold text-fg">{form.code}</span> gives{" "}
                    <span className="font-bold text-fg">
                      {form.type === "percent" ? `${form.value}% off` : `৳${Number(form.value).toLocaleString()} off`}
                    </span>
                    {form.minOrderAmount && ` on orders above ৳${Number(form.minOrderAmount).toLocaleString()}`}
                    {form.expiresAt && ` · expires ${new Date(form.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    {form.usageLimit && ` · max ${form.usageLimit} uses`}.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm font-semibold text-[color:var(--danger)] bg-[color:var(--danger-tint)] px-4 py-2.5 rounded-xl">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[color:var(--line)] flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-[color:var(--line)] text-sm font-semibold text-[color:var(--fg-muted)] hover:bg-[color:var(--surface)] transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving || !form.code || !form.value}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: "var(--surface)", color: "var(--fg)" }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Coupon"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
