"use client";

import { useState } from "react";
import Link from "next/link";

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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f9f9f9" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-['Playfair_Display'] text-3xl font-bold text-black tracking-tight">
            Aura<span style={{ color: "#c9a84c" }}>·</span>Goli
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: "0 20px 60px rgba(11,11,20,0.10)" }}>
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-3xl text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
              </div>
              <h1 className="font-['Playfair_Display'] text-2xl font-bold text-black mb-3">Check your inbox</h1>
              <p className="text-sm text-[#747878] mb-6 leading-relaxed">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link. Check your spam folder too.
              </p>
              <Link href="/login" className="text-sm text-[#5951b4] font-semibold hover:underline">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-['Playfair_Display'] text-2xl font-bold text-black mb-2">Forgot password?</h1>
              <p className="text-sm text-[#747878] mb-7">Enter your email and we&apos;ll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#444748] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-xl px-4 py-3.5 text-sm border border-[#e8e8e8] bg-[#fafafa] outline-none focus:border-[#3d2b7a] transition-all"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 text-sm bg-[#ffdad6] border border-[#ba1a1a]/15 text-[#ba1a1a]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl py-4 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#0b0b14", color: "#faf7f0", boxShadow: "0 6px 0 rgba(0,0,0,0.4)" }}
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                  ) : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-[#5951b4] font-semibold">
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
