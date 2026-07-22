"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface Settings {
  storeName: string; legalName: string; email: string;
  phone: string; address: string; currency: string;
  timezone: string; weightUnit: string; maintenanceMode: boolean;
  instagramUrl: string; facebookUrl: string; tiktokUrl: string; youtubeUrl: string;
}

const INPUT = "w-full border border-[color:var(--line)] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[color:var(--accent)] transition-colors bg-surface";

export default function StoreSettingsPage() {
  const [form, setForm] = useState<Settings>({
    storeName: "", legalName: "", email: "", phone: "", address: "",
    currency: "BDT", timezone: "Asia/Dhaka", weightUnit: "kg", maintenanceMode: false,
    instagramUrl: "", facebookUrl: "", tiktokUrl: "", youtubeUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.storeName !== undefined) setForm(d); })
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const token = localStorage.getItem("adminToken");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <AdminShell title="Store Settings">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-line-strong border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Store Settings">
      <div className="max-w-3xl space-y-6">

        {/* Store Identity */}
        <section className="bg-surface rounded-2xl border border-[color:var(--line)] p-6 md:p-8">
          <h2 className="text-[20px] font-semibold text-fg mb-6">Store Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-2">Store Name</label>
              <input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} className={INPUT}
                placeholder="e.g. Aura Goli" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-2">Legal Entity Name</label>
              <input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} className={INPUT}
                placeholder="e.g. Aura Goli Ltd." />
            </div>
          </div>
        </section>

        {/* Contact Details */}
        <section className="bg-surface rounded-2xl border border-[color:var(--line)] p-6 md:p-8">
          <h2 className="text-[20px] font-semibold text-fg mb-6">Contact Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-2">Public Email</label>
              <input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" className={INPUT}
                placeholder="hello@youstore.com" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-2">Phone</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={INPUT}
                  placeholder="+880 1700 000000" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-2">Business Address</label>
                <input value={form.address} onChange={(e) => set("address", e.target.value)} className={INPUT}
                  placeholder="Dhaka, Bangladesh" />
              </div>
            </div>
          </div>
        </section>

        {/* Regional Settings */}
        <section className="bg-surface rounded-2xl border border-[color:var(--line)] p-6 md:p-8">
          <h2 className="text-[20px] font-semibold text-fg mb-6">Regional Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-2">Currency</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={INPUT}>
                <option value="BDT">BDT — Bangladeshi Taka (৳)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-2">Time Zone</label>
              <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className={INPUT}>
                <option value="Asia/Dhaka">Asia/Dhaka (UTC+6)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
                <option value="Europe/London">Europe/London (UTC+0)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-3">Weight Units</label>
            <div className="flex gap-6">
              {(["kg", "g", "lb"] as const).map((v) => {
                const labels: Record<string, string> = { kg: "Kilograms (kg)", g: "Grams (g)", lb: "Pounds (lb)" };
                return (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="weight" value={v} checked={form.weightUnit === v}
                      onChange={() => set("weightUnit", v)} className="accent-black" />
                    <span className="text-[14px] text-[color:var(--fg)]">{labels[v]}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        {/* Social Media */}
        <section className="bg-surface rounded-2xl border border-[color:var(--line)] p-6 md:p-8">
          <h2 className="text-[20px] font-semibold text-fg mb-6">Social Media</h2>
          <div className="space-y-4">
            {[
              { key: "instagramUrl" as const, label: "Instagram URL", placeholder: "https://instagram.com/auragoli" },
              { key: "facebookUrl" as const, label: "Facebook URL", placeholder: "https://facebook.com/auragoli" },
              { key: "tiktokUrl" as const, label: "TikTok URL", placeholder: "https://tiktok.com/@auragoli" },
              { key: "youtubeUrl" as const, label: "YouTube URL", placeholder: "https://youtube.com/@auragoli" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-1.5">{label}</label>
                <input type="url" value={form[key]} onChange={(e) => set(key, e.target.value)} className={INPUT} placeholder={placeholder} />
              </div>
            ))}
          </div>
        </section>

        {/* Advanced — Maintenance only, no danger zone */}
        <section className="bg-surface rounded-2xl border border-[color:var(--line)] p-6 md:p-8">
          <h2 className="text-[20px] font-semibold text-fg mb-6">Advanced</h2>
          <div className="flex items-center justify-between p-5 rounded-2xl"
            style={{ background: form.maintenanceMode ? "var(--danger-tint)" : "var(--surface)", border: `1px solid ${form.maintenanceMode ? "var(--danger)" : "var(--line)"}` }}>
            <div>
              <p className="font-semibold text-fg text-[15px]">Maintenance Mode</p>
              <p className="text-[13px] mt-0.5" style={{ color: form.maintenanceMode ? "var(--danger)" : "var(--fg-muted)" }}>
                {form.maintenanceMode
                  ? "⚠ Store is currently in maintenance — visitors see a maintenance notice."
                  : "Temporarily show a maintenance notice to all store visitors."}
              </p>
            </div>
            <button onClick={() => set("maintenanceMode", !form.maintenanceMode)}
              className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors ml-4 shrink-0"
              style={{ background: form.maintenanceMode ? "var(--danger)" : "var(--fg-subtle)" }}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow transition-transform ${form.maintenanceMode ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </section>

        {/* Save */}
        {error && <p className="text-sm text-[color:var(--danger)] text-right">{error}</p>}
        <div className="flex justify-end pb-8">
          <button onClick={handleSave} disabled={saving}
            className="px-8 py-3.5 rounded-full text-[14px] font-semibold disabled:opacity-50 transition-all"
            style={{
              background: saved ? "var(--accent)" : "var(--canvas)",
              color: "var(--fg)",
              boxShadow: "0 4px 0 rgba(0,0,0,0.3), 0 8px 20px rgba(11,11,20,0.2)",
            }}>
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
