"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/account/orders";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Surface OAuth errors and password reset success from the callback redirect
  useEffect(() => {
    if (sp.get("reset") === "success") {
      setSuccess("Password updated! Sign in with your new password.");
    }
    if (sp.get("verified") === "1") {
      setSuccess("Email verified! You can now sign in.");
    }
    const oauthError = sp.get("error");
    if (oauthError) {
      const messages: Record<string, string> = {
        google_denied: "Google sign-in was cancelled.",
        google_token_failed: "Couldn't connect to Google. Please try again.",
        google_userinfo_failed: "Couldn't fetch your Google profile. Please try again.",
        account_suspended: "Your account has been suspended. Please contact support.",
        oauth_not_configured: "Google sign-in is not available right now.",
      };
      setError(messages[oauthError] ?? "Google sign-in failed. Please try again.");
    }
  }, [sp]);

  function handleGoogleSignIn() {
    const params = new URLSearchParams({ next });
    window.location.href = `/api/auth/google?${params}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login" ? { email, password } : { name, email, password };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    localStorage.setItem("userToken", data.accessToken);
    window.dispatchEvent(new Event("user-updated"));
    router.push(next);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "#0b0b14" }}>

      {/* ── Left brand panel (desktop only) ──────────────────── */}
      <div className="hidden md:flex md:w-[45%] relative overflow-hidden flex-col items-center justify-center"
        style={{ background: "linear-gradient(145deg, #1a0d2e 0%, #12103a 50%, #0b0b14 100%)" }}>
        <div className="absolute w-96 h-96 rounded-full -top-20 -left-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(201,168,76,0.3) 0%, transparent 70%)" }} />
        <div className="absolute w-64 h-64 rounded-full bottom-24 -right-12 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(159,151,255,0.2) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-xs text-center px-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] mb-6"
            style={{ color: "rgba(201,168,76,0.6)" }}>Welcome to</p>
          <h1 className="font-['Playfair_Display'] text-5xl font-bold leading-none mb-4"
            style={{ color: "#faf7f0" }}>
            Aura<br /><span style={{ color: "#c9a84c" }}>Goli</span>
          </h1>
          <p className="text-sm leading-relaxed mt-6" style={{ color: "rgba(250,247,240,0.45)" }}>
            Premium threads, crafted with care. Join a community that wears with intention.
          </p>

          <div className="mt-12 text-left rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="font-['Playfair_Display'] text-sm italic leading-relaxed"
              style={{ color: "rgba(250,247,240,0.7)" }}>
              &ldquo;The quality speaks for itself. Aura Goli changed how I dress.&rdquo;
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-6 h-px" style={{ background: "#c9a84c" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#c9a84c" }}>James L.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen md:min-h-0 px-5 py-10 relative"
        style={{ background: "#f9f9f9" }}>

        <Link href="/"
          className="md:hidden absolute top-5 left-5 flex items-center gap-1.5 text-sm text-[#444748]">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back
        </Link>

        <div className="w-full max-w-md">
          <div className="md:hidden text-center mb-8">
            <Link href="/" className="font-['Playfair_Display'] text-3xl font-bold text-black tracking-tight">
              Aura<span style={{ color: "#c9a84c" }}>·</span>Goli
            </Link>
            <p className="text-sm text-[#747878] mt-1">Premium threads, crafted with care.</p>
          </div>

          <div className="bg-white rounded-3xl p-7 md:p-8"
            style={{ boxShadow: "0 20px 60px rgba(11,11,20,0.12), 0 4px 16px rgba(11,11,20,0.06)" }}>

            {/* Mode toggle */}
            <div className="flex rounded-2xl overflow-hidden mb-7 p-1 gap-1"
              style={{ background: "#f4f3f3" }}>
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-200"
                  style={{
                    background: mode === m ? "#0b0b14" : "transparent",
                    color: mode === m ? "#faf7f0" : "#747878",
                    boxShadow: mode === m ? "0 3px 10px rgba(11,11,20,0.25)" : "none",
                  }}
                >
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#444748] mb-1.5">
                    Full Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl px-4 py-3.5 text-sm border border-[#e8e8e8] bg-[#fafafa] outline-none focus:border-[#3d2b7a] transition-all"
                    placeholder="Your full name"
                    required
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#444748] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm border border-[#e8e8e8] bg-[#fafafa] outline-none focus:border-[#3d2b7a] transition-all"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-[#444748]">
                    Password
                  </label>
                  {mode === "login" && (
                    <Link href="/forgot-password" className="text-xs text-[#5951b4]">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl px-4 py-3.5 pr-12 text-sm border border-[#e8e8e8] bg-[#fafafa] outline-none focus:border-[#3d2b7a] transition-all"
                    placeholder={mode === "register" ? "Min. 8 characters" : "Your password"}
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#747878]"
                  >
                    <span className="material-symbols-outlined text-lg">{showPass ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>

              {success && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm bg-green-50 border border-green-200">
                  <span className="material-symbols-outlined text-base text-green-600 mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="text-green-700">{success}</span>
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm bg-[#ffdad6] border border-[#ba1a1a]/15">
                  <span className="material-symbols-outlined text-base text-[#ba1a1a] mt-0.5 shrink-0">error</span>
                  <span className="text-[#ba1a1a]">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-4 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50 mt-2 flex items-center justify-center gap-2 transition-all"
                style={{
                  background: "#0b0b14",
                  color: "#faf7f0",
                  boxShadow: "0 6px 0 rgba(0,0,0,0.4), 0 10px 28px rgba(11,11,20,0.2)",
                }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Please wait…
                  </>
                ) : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-[#e8e8e8]" />
              <span className="text-xs text-[#c4c7c7]">OR</span>
              <div className="flex-1 h-px bg-[#e8e8e8]" />
            </div>

            {/* Google sign-in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 rounded-2xl py-3.5 text-sm font-semibold border transition-all hover:bg-[#f9f9f9] active:scale-[0.98]"
              style={{ borderColor: "#e0e0e0", color: "#3c4043", background: "#fff" }}
            >
              {/* Google "G" logo SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                className="text-sm text-[#5951b4] font-semibold"
              >
                {mode === "login" ? "Don't have an account? Register" : "Already have an account? Sign In"}
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#747878] mt-5 px-4 leading-relaxed">
            By continuing you agree to our{" "}
            <Link href="/privacy" className="underline hover:text-black">Privacy Policy</Link>
            {" "}and{" "}
            <Link href="/terms" className="underline hover:text-black">Terms of Service</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
