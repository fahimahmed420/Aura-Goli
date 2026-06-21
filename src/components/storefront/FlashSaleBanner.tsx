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

const DISMISS_KEY = "ag_flash_dismissed_until";

export default function FlashSaleBanner() {
  const [sale, setSale] = useState<FlashSale | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const until = localStorage.getItem(DISMISS_KEY);
    if (until && Date.now() < Number(until)) { setDismissed(true); return; }

    fetch("/api/flash-sale")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.sale) {
          setSale(d.sale);
          setTimeout(() => setVisible(true), 1500);
        }
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 5 * 60 * 1000));
      setDismissed(true);
      window.dispatchEvent(new Event("flash-banner-dismissed"));
    }, 300);
  }

  const time = useCountdown(sale?.endsAt ?? "");

  if (!sale || dismissed || !time) return null;

  return (
    <div
      className="fixed z-[59] transition-all duration-500 ease-out"
      style={{
        bottom: visible ? "24px" : "-200px",
        right: "20px",
        left: "20px",
        maxWidth: "360px",
        margin: "0 auto",
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #0b0b14 0%, #1a1230 100%)",
          border: "1px solid rgba(201,168,76,0.25)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,168,76,0.08)",
        }}
      >
        {/* Gold accent line */}
        <div style={{ height: "3px", background: "linear-gradient(90deg, #c9a84c, #d4b05a, #c9a84c)" }} />

        <div className="px-5 py-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">⚡</span>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: "#c9a84c" }}>Flash Sale</p>
              </div>
              <p className="text-[15px] font-bold leading-snug" style={{ color: "#faf7f0" }}>{sale.bannerText}</p>
              <p className="text-[12px] mt-0.5" style={{ color: "rgba(250,247,240,0.5)" }}>{sale.discountPercent}% off sitewide</p>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
              style={{ background: "rgba(250,247,240,0.1)", color: "rgba(250,247,240,0.5)" }}
              aria-label="Dismiss">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[10px] font-semibold" style={{ color: "rgba(250,247,240,0.4)" }}>Ends in</p>
            <div className="flex items-center gap-1">
              {[{ val: time.h, label: "hr" }, { val: time.m, label: "min" }, { val: time.s, label: "sec" }].map(({ val, label }, i) => (
                <div key={label} className="flex items-center gap-1">
                  {i > 0 && <span className="font-bold text-sm" style={{ color: "rgba(201,168,76,0.5)" }}>:</span>}
                  <div className="flex flex-col items-center px-2 py-1 rounded-lg"
                    style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.15)" }}>
                    <span className="font-mono font-bold text-[15px] leading-none tabular-nums" style={{ color: "#c9a84c" }}>
                      {String(val).padStart(2, "0")}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(201,168,76,0.5)" }}>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/shop"
            onClick={dismiss}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(90deg, #c9a84c, #d4b05a)", color: "#0b0b14" }}>
            Shop the Sale
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
