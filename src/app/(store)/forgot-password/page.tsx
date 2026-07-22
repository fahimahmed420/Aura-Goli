"use client";

import { useState } from "react";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Something went wrong.");
      } else {
        setSent(true);
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
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "var(--success-tint)" }}>
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1", color: "var(--success)" }}>mark_email_read</span>
              </div>
              <h1 className="dd-display text-2xl text-fg mb-3">Check your inbox</h1>
              <p className="text-sm text-fg-muted mb-6 leading-relaxed">
                If an account exists for <strong className="text-fg">{email}</strong>, we&apos;ve sent a password reset link. Check your spam folder too.
              </p>
              <Link href="/login" className="text-sm text-accent font-medium hover:underline">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="dd-display text-2xl text-fg mb-2">Forgot password?</h1>
              <p className="text-sm text-fg-muted mb-7">Enter your email and we&apos;ll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-fg-muted mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="field-input"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--danger-tint)", border: "1px solid var(--danger)", color: "var(--danger)" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl py-4 text-[11px] font-medium uppercase tracking-[0.18em] disabled:opacity-50 flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover transition-colors"
                >
                  {loading ? (
                    <><Spinner size={16} /> Sending…</>
                  ) : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-accent font-medium">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
