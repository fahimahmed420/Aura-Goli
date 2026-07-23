"use client";

import { useEffect, useState } from "react";
import AuraLoadingScreen from "@/components/ui/AuraLoadingScreen";

interface Address {
  id: string; fullName: string; phone: string;
  line1: string; line2?: string | null;
  city: string; postalCode: string; district: string; thana: string;
  isDefault: boolean;
}

const EMPTY_FORM = { fullName: "", phone: "", line1: "", line2: "", city: "", district: "", thana: "", postalCode: "", isDefault: false };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function fetchAddresses() {
    const token = localStorage.getItem("ag_authed");
    const res = await fetch("/api/account/addresses", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setAddresses(data.addresses ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAddresses(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const token = localStorage.getItem("ag_authed");
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchAddresses();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save address.");
    }
    setSaving(false);
  }

  async function setDefault(id: string) {
    const token = localStorage.getItem("ag_authed");
    await fetch(`/api/account/addresses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isDefault: true }),
    });
    fetchAddresses();
  }

  async function remove(id: string) {
    setDeleting(id);
    const token = localStorage.getItem("ag_authed");
    await fetch(`/api/account/addresses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    setDeleting(null);
  }

  if (loading) return <AuraLoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="dd-display text-[28px] text-fg">Addresses</h2>
          <p className="text-fg-muted text-[14px] mt-1">Manage your delivery addresses.</p>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setError(""); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-fg text-[13px] font-medium rounded-full hover:bg-accent-hover transition-opacity">
          <span className="material-symbols-outlined text-[18px]">{showForm ? "close" : "add"}</span>
          {showForm ? "Cancel" : "Add New Address"}
        </button>
      </div>

      {/* Add address form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-2xl p-6 space-y-4">
          <h3 className="font-medium text-fg text-[16px]">New Address</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "fullName", label: "Full Name", required: true },
              { key: "phone", label: "Phone", required: false },
              { key: "line1", label: "Address Line 1", required: true },
              { key: "line2", label: "Address Line 2 (optional)", required: false },
              { key: "city", label: "City", required: true },
              { key: "district", label: "District", required: false },
              { key: "thana", label: "Thana / Upazila", required: false },
              { key: "postalCode", label: "Postal Code", required: false },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-[11px] font-medium text-fg-muted uppercase tracking-wider mb-1">{label}</label>
                <input
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  required={required}
                  className="w-full border border-line rounded-xl px-3 py-2.5 text-[14px] bg-[var(--field-bg)] text-fg focus:outline-none focus:border-[var(--field-border-focus)] transition-colors"
                />
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="accent-current" />
            <span className="text-[14px] text-fg-muted">Set as default shipping address</span>
          </label>
          {error && <p className="text-[13px] text-[color:var(--danger)]">{error}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-accent text-accent-fg rounded-full text-[13px] font-medium hover:bg-accent-hover transition-opacity disabled:opacity-50">
              {saving ? "Saving…" : "Save Address"}
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="bg-surface border border-line rounded-2xl p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-fg-subtle mb-3 block">location_off</span>
          <h3 className="dd-display text-[20px] text-fg mb-2">No addresses saved</h3>
          <p className="text-fg-muted text-[14px]">Add a delivery address to speed up checkout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className={`bg-surface rounded-2xl border-2 p-6 ${addr.isDefault ? "border-accent" : "border-line"}`}>
              <div className="flex items-start justify-between mb-4">
                {addr.isDefault
                  ? <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-accent text-accent-fg">Default</span>
                  : <span />}
                <div className="flex gap-1">
                  <button onClick={() => remove(addr.id)} disabled={deleting === addr.id}
                    className="p-1.5 text-fg-subtle hover:text-[color:var(--danger)] transition-colors disabled:opacity-40">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
              <p className="font-medium text-[15px] text-fg">{addr.fullName}</p>
              {addr.phone && <p className="text-[13px] text-fg-muted">{addr.phone}</p>}
              <p className="text-[14px] text-fg-muted mt-1">{addr.line1}</p>
              {addr.line2 && <p className="text-[14px] text-fg-muted">{addr.line2}</p>}
              <p className="text-[14px] text-fg-muted">{addr.city}{addr.postalCode ? `, ${addr.postalCode}` : ""}</p>
              <div className="mt-4">
                {!addr.isDefault && (
                  <button onClick={() => setDefault(addr.id)}
                    className="text-[12px] font-medium text-accent hover:underline">
                    Set as default
                  </button>
                )}
              </div>
            </div>
          ))}

          <button onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="border-2 border-dashed border-line rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-line-strong transition-colors min-h-[180px]">
            <span className="material-symbols-outlined text-3xl text-fg-subtle">add_location_alt</span>
            <p className="text-[14px] font-medium text-fg-muted">Add another address</p>
          </button>
        </div>
      )}
    </div>
  );
}
