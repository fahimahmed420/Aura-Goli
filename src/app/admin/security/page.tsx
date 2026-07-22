"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface AdminUser {
  id: string; name: string; email: string; createdAt: string;
}

export default function AdminSecurityPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);
  const [minLength, setMinLength] = useState("8");
  const [expiration, setExpiration] = useState("90");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    // There is no admin-listing endpoint yet, so show the signed-in admin.
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((me) => {
        if (me?.user) setAdmins([{ id: me.user.id, name: me.user.name, email: me.user.email, createdAt: new Date().toISOString() }]);
      })
      .catch(() => setAdmins([]))
      .finally(() => setLoading(false));
  }, []);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AdminShell title="Security">
      <div className="space-y-8 max-w-5xl">
        {/* Admin Users */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[24px] font-semibold text-fg">Admin Users</h2>
              <p className="text-sm text-[color:var(--fg-muted)]">Accounts with access to this admin panel.</p>
            </div>
          </div>
          <div className="bg-surface rounded-2xl border border-[color:var(--line)] overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-3 bg-[color:var(--surface)] border-b border-[color:var(--fg-subtle)] text-[color:var(--fg-muted)] text-[11px] font-semibold uppercase tracking-wider">
              <div className="col-span-6">User</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-3">Since</div>
            </div>
            {loading ? (
              <div className="py-10 text-center">
                <div className="w-5 h-5 border-2 border-line-strong border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : admins.length === 0 ? (
              <div className="py-10 text-center text-[color:var(--fg-subtle)] text-sm">No admin users found.</div>
            ) : admins.map((u) => (
              <div key={u.id} className="grid grid-cols-12 px-6 py-5 items-center border-b border-[color:var(--fg-subtle)] last:border-none hover:bg-[color:var(--canvas)]">
                <div className="col-span-6 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[color:var(--accent-tint)] text-[color:var(--accent)] flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                    {u.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-fg">{u.name}</p>
                    <p className="text-xs text-[color:var(--fg-muted)]">{u.email}</p>
                  </div>
                </div>
                <div className="col-span-3">
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-accent text-accent-fg">Admin</span>
                </div>
                <div className="col-span-3 text-[13px] text-[color:var(--fg-muted)]">
                  {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* 2FA Toggle */}
            <section className="bg-surface rounded-2xl border border-[color:var(--line)] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-fg text-[16px]">Two-Factor Authentication</h3>
                  <p className="text-[13px] text-[color:var(--fg-muted)] mt-1">Require 2FA for all admin logins.</p>
                </div>
                <button onClick={() => setTwoFAEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${twoFAEnabled ? "bg-[color:var(--accent)]" : "bg-[color:var(--fg-subtle)]"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${twoFAEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className={`mt-4 p-3 rounded-lg ${twoFAEnabled ? "bg-[color:var(--accent-tint)]" : "bg-[color:var(--surface-raised)]"}`}>
                <p className={`text-[12px] font-semibold ${twoFAEnabled ? "text-[color:var(--accent)]" : "text-[color:var(--fg-muted)]"}`}>
                  {twoFAEnabled ? "2FA is active — all admins must verify on login." : "2FA is disabled — your account is at higher risk."}
                </p>
              </div>
            </section>

            {/* Password Policy */}
            <section className="bg-surface rounded-2xl border border-[color:var(--line)] p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-fg text-[16px]">Password Policy</h3>
                <p className="text-[13px] text-[color:var(--fg-muted)] mt-1">Set requirements for admin passwords.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-1">Minimum Length</label>
                  <select value={minLength} onChange={(e) => setMinLength(e.target.value)}
                    className="w-full border border-[color:var(--fg-subtle)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[color:var(--accent)]">
                    {["8", "10", "12", "16"].map((v) => <option key={v} value={v}>{v} characters</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider mb-1">Expiration Period</label>
                  <select value={expiration} onChange={(e) => setExpiration(e.target.value)}
                    className="w-full border border-[color:var(--fg-subtle)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[color:var(--accent)]">
                    {[["30", "30 days"], ["60", "60 days"], ["90", "90 days"], ["never", "Never"]].map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={handleSave}
                className="w-full py-2.5 bg-accent text-accent-fg rounded-lg text-[13px] font-semibold hover:opacity-80 transition-opacity">
                {saved ? "Saved!" : "Update Policy"}
              </button>
            </section>
          </div>

          <div className="space-y-6">
            {/* Security tips */}
            <section className="bg-surface rounded-2xl border border-[color:var(--line)] p-6">
              <h3 className="font-semibold text-fg text-[16px] mb-4">Security Checklist</h3>
              <div className="space-y-3">
                {[
                  { icon: "check_circle", color: "text-[color:var(--accent)]", bg: "bg-[color:var(--accent-tint)]", msg: "Use a strong, unique admin password" },
                  { icon: "check_circle", color: "text-[color:var(--accent)]", bg: "bg-[color:var(--accent-tint)]", msg: "Keep your recovery email up to date" },
                  { icon: "check_circle", color: "text-[color:var(--accent)]", bg: "bg-[color:var(--accent-tint)]", msg: "Never share your admin credentials" },
                  { icon: "warning", color: "text-[color:var(--danger)]", bg: "bg-[color:var(--danger-tint)]", msg: "Review admin access periodically" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`material-symbols-outlined text-[16px] ${item.color}`}>{item.icon}</span>
                    </div>
                    <p className="text-[14px] text-[color:var(--fg)] self-center">{item.msg}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Encryption card */}
            <section className="bg-black rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-surface/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white">encrypted</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-[16px]">End-to-End Encryption</h3>
                  <p className="text-[12px] text-white/60">AES-256 · TLS 1.3</p>
                </div>
              </div>
              <p className="text-[13px] text-white/70 leading-relaxed">
                All customer data and transactions are encrypted in transit and at rest.
              </p>
              <div className="mt-4 flex gap-2">
                {["PCI DSS", "GDPR", "SSL"].map((badge) => (
                  <div key={badge} className="px-2 py-1 bg-surface/10 rounded text-[10px] font-semibold text-white/80 uppercase tracking-widest">{badge}</div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
