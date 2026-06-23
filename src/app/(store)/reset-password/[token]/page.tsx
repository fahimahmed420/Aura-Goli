"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const { token } = use(params);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Reset failed. The link may have expired.");
      } else {
        router.replace("/login?reset=success");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f9f9f9" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-['Playfair_Display'] text-3xl font-bold text-black tracking-tight">
            Aura<span style={{ color: "#c9a84c" }}>·</span>Goli
          </Link>
        </div>
        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: "0 20px 60px rgba(11,11,20,0.10)" }}>
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-black mb-2">Set new password</h1>
          <p className="text-sm text-[#747878] mb-7">Choose a strong password for your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#444748] mb-1.5">New Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={8}
                  className="w-full rounded-xl px-4 py-3.5 pr-12 text-sm border border-[#e8e8e8] bg-[#fafafa] outline-none focus:border-[#3d2b7a] transition-all"
                  placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#747878]">
                  <span className="material-symbols-outlined text-lg">{showPass ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#444748] mb-1.5">Confirm Password</label>
              <input type={showPass ? "text" : "password"} value={confirm}
                onChange={(e) => setConfirm(e.target.value)} required minLength={8}
                className="w-full rounded-xl px-4 py-3.5 text-sm border border-[#e8e8e8] bg-[#fafafa] outline-none focus:border-[#3d2b7a] transition-all"
                placeholder="Repeat password" />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm bg-[#ffdad6] border border-[#ba1a1a]/15 text-[#ba1a1a]">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl py-4 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "#0b0b14", color: "#faf7f0", boxShadow: "0 6px 0 rgba(0,0,0,0.4)" }}>
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating…</> : "Update Password"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-[#5951b4] font-semibold">Back to Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
