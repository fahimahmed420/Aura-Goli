"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-[#f9f9f9] flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#1c1b1b] p-16">
        <h1 className="font-['Playfair_Display'] text-4xl font-bold text-white tracking-tighter">Aura Goli</h1>
        <div>
          <p className="font-['Playfair_Display'] text-5xl font-bold text-white leading-tight mb-4">
            The power of your store, in one place.
          </p>
          <p className="text-[#858383] text-lg">Manage products, orders, and customers with precision.</p>
        </div>
        <p className="text-[#858383] text-sm">Admin Console · Restricted Access</p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="font-['Playfair_Display'] text-3xl font-bold text-black mb-2">Admin Sign In</h2>
            <p className="text-[#444748]">Enter your credentials to access the admin console.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#1a1c1c] mb-2 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-[#c4c7c7] bg-white px-4 py-3 text-sm outline-none focus:border-black transition-colors"
                placeholder="admin@auragoli.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1a1c1c] mb-2 uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-[#c4c7c7] bg-white px-4 py-3 text-sm outline-none focus:border-black transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 px-4 py-3 text-sm text-[#93000a] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 font-semibold uppercase tracking-widest text-sm hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
