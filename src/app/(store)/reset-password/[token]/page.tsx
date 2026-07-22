"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/Spinner";

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="dd-display text-3xl text-fg tracking-tight">
            Aura<span className="text-accent">·</span>Goli
          </Link>
        </div>
        <div className="bg-surface border border-line rounded-3xl p-8">
          <h1 className="dd-display text-2xl text-fg mb-2">Set new password</h1>
          <p className="text-sm text-fg-muted mb-7">Choose a strong password for your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-fg-muted mb-1.5">New Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={8}
                  className="field-input pr-12"
                  placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle">
                  <span className="material-symbols-outlined text-lg">{showPass ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-fg-muted mb-1.5">Confirm Password</label>
              <input type={showPass ? "text" : "password"} value={confirm}
                onChange={(e) => setConfirm(e.target.value)} required minLength={8}
                className="field-input"
                placeholder="Repeat password" />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--danger-tint)", border: "1px solid var(--danger)", color: "var(--danger)" }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl py-4 text-[11px] font-medium uppercase tracking-[0.18em] disabled:opacity-50 flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover transition-colors">
              {loading ? <><Spinner size={16} /> Updating…</> : "Update Password"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-accent font-medium">Back to Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
