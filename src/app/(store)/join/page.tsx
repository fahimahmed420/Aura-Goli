"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
  const sp = useSearchParams();
  const ref = sp.get("ref");

  useEffect(() => {
    if (ref) {
      localStorage.setItem("referralCode", ref);
    }
  }, [ref]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16"
      style={{ background: "linear-gradient(145deg, #1a0d2e 0%, #12103a 50%, #0b0b14 100%)" }}>

      {/* Decorative glow */}
      <div className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(201,168,76,0.25) 0%, transparent 70%)",
          top: "10%", left: "50%", transform: "translateX(-50%)",
        }} />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Brand */}
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] mb-4"
          style={{ color: "rgba(201,168,76,0.6)" }}>
          You&apos;ve been invited to
        </p>
        <h1 className="font-['Playfair_Display'] text-5xl font-bold mb-2" style={{ color: "#faf7f0" }}>
          Aura<span style={{ color: "#c9a84c" }}>Goli</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: "rgba(250,247,240,0.5)" }}>
          Premium threads, crafted with care.
        </p>

        {/* Invite card */}
        <div className="rounded-3xl p-7 mb-6 text-left"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(201,168,76,0.2)", border: "1.5px solid rgba(201,168,76,0.4)" }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: "#c9a84c", fontVariationSettings: "'FILL' 1" }}>
                card_giftcard
              </span>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#faf7f0" }}>Exclusive welcome offer</p>
              <p className="text-xs" style={{ color: "rgba(250,247,240,0.5)" }}>For referred members only</p>
            </div>
          </div>

          <div className="rounded-2xl p-4 mb-1"
            style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <p className="font-['Playfair_Display'] text-2xl font-bold mb-1" style={{ color: "#c9a84c" }}>
              10% off your first order
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(250,247,240,0.6)" }}>
              Sign up today and receive a 10% discount coupon that will be applied automatically after your first purchase.
            </p>
          </div>
        </div>

        {ref && (
          <p className="text-xs mb-4 rounded-xl px-4 py-2 inline-block"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(250,247,240,0.5)" }}>
            Referral code: <span className="font-mono font-bold" style={{ color: "#c9a84c" }}>{ref}</span>
          </p>
        )}

        <Link
          href="/login"
          className="block w-full rounded-2xl py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-center transition-all"
          style={{
            background: "#c9a84c",
            color: "#0b0b14",
            boxShadow: "0 6px 0 rgba(0,0,0,0.4), 0 10px 28px rgba(201,168,76,0.3)",
          }}
        >
          Create Account &amp; Claim Offer
        </Link>

        <p className="text-xs mt-4" style={{ color: "rgba(250,247,240,0.3)" }}>
          Already have an account?{" "}
          <Link href="/login" className="underline" style={{ color: "rgba(250,247,240,0.5)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
