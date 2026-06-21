"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface FlashSale { id: string; name: string; bannerText: string; discountPercent: number; endsAt: string; }

function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s };
  }, [endsAt]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);
  return time;
}

function Digit({ val, label }: { val: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono font-bold text-base leading-none tabular-nums" style={{ color: "#0b0b14" }}>
        {String(val).padStart(2, "0")}
      </span>
      <span className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(11,11,20,0.5)" }}>{label}</span>
    </div>
  );
}

const DISMISS_KEY = "ag_flash_dismissed_until";

export default function FlashSaleBanner() {
  const [sale, setSale] = useState<FlashSale | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check 5-min suppression
    const until = localStorage.getItem(DISMISS_KEY);
    if (until && Date.now() < Number(until)) { setDismissed(true); return; }

    fetch("/api/flash-sale")
      .then(r => r.ok ? r.json() : null)
      .then(d => setSale(d?.sale ?? null))
      .catch(() => setSale(null));
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 5 * 60 * 1000));
    setDismissed(true);
    window.dispatchEvent(new Event("flash-banner-dismissed"));
  }

  const time = useCountdown(sale?.endsAt ?? "");

  if (!sale || dismissed || !time) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] w-full" style={{ background: "linear-gradient(90deg, #c9a84c 0%, #d4b05a 50%, #c9a84c 100%)" }}>
      <div className="max-w-[1400px] mx-auto px-4 h-10 flex items-center justify-between gap-4">
        {/* Left: text */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold shrink-0" style={{ color: "#0b0b14" }}>⚡ {sale.bannerText}</span>
          <span className="hidden sm:inline text-xs shrink-0" style={{ color: "rgba(11,11,20,0.6)" }}>· {sale.discountPercent}% off</span>
        </div>
        {/* Center: countdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold hidden sm:block" style={{ color: "rgba(11,11,20,0.55)" }}>Ends in</span>
          <div className="flex items-center gap-1">
            <Digit val={time.h} label="hr" />
            <span className="font-bold text-base" style={{ color: "rgba(11,11,20,0.4)" }}>:</span>
            <Digit val={time.m} label="min" />
            <span className="font-bold text-base" style={{ color: "rgba(11,11,20,0.4)" }}>:</span>
            <Digit val={time.s} label="sec" />
          </div>
        </div>
        {/* Right: CTA + dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/shop" className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all"
            style={{ background: "#0b0b14", color: "#c9a84c" }}>
            Shop Now
          </Link>
          <button onClick={dismiss} style={{ color: "rgba(11,11,20,0.5)" }} aria-label="Dismiss">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
