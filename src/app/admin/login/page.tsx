"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sp.get("error") === "not_admin") setError("not_admin");
  }, [sp]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      localStorage.setItem("adminToken", data.accessToken);
      router.push("/admin/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--canvas)] flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[color:var(--surface)] p-16">
        <h1 className="dd-display text-4xl text-fg tracking-tighter">Aura Goli</h1>
        <div>
          <p className="dd-display text-5xl leading-tight mb-4 text-fg">
            The power of your store, in one place.
          </p>
          <p className="text-[color:var(--fg-muted)] text-lg">Manage products, orders, and customers with precision.</p>
        </div>
        <p className="text-[color:var(--fg-muted)] text-sm">Admin Console · Restricted Access</p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="dd-display text-3xl text-fg mb-2">Admin Sign In</h2>
            <p className="text-[color:var(--fg-muted)]">Enter your credentials to access the admin console.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[color:var(--fg)] mb-2 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field-input"
                placeholder="admin@auragoli.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[color:var(--fg)] mb-2 uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-[color:var(--danger-tint)] border border-[color:var(--danger)]/20 px-4 py-3 text-sm text-[color:var(--danger)] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-accent-fg py-4 font-medium uppercase tracking-widest text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[color:var(--line)]" />
            <span className="text-xs text-[color:var(--fg-subtle)] uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-[color:var(--line)]" />
          </div>

          <a
            href="/api/auth/google?admin=1"
            className="w-full flex items-center justify-center gap-3 border border-line-strong py-3.5 text-sm font-medium text-fg hover:bg-surface transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>

          {error && error.includes("not_admin") && (
            <p className="mt-3 text-sm text-center text-[color:var(--danger)]">That Google account does not have admin access.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[color:var(--canvas)]" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
