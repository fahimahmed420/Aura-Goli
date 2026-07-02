"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Real WebGL silk background — loaded client-side only, never blocks first paint.
const HeroFabricCanvas = dynamic(() => import("./HeroFabricCanvas"), { ssr: false });

export default function Hero3D({ storeName }: { storeName?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ rx: 0, ry: 0 });
  const [mounted, setMounted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [reduceMo, setReduceMo] = useState(false);
  const rafRef = useRef<number>(0);
  const targetRef = useRef({ rx: 0, ry: 0 });
  const currentRef = useRef({ rx: 0, ry: 0 });
  const runningRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function tick() {
      const c = currentRef.current, t = targetRef.current;
      c.rx = lerp(c.rx, t.rx, 0.08);
      c.ry = lerp(c.ry, t.ry, 0.08);
      // Settle: within sub-pixel of target → write once and stop. No idle churn.
      const done = Math.abs(c.rx - t.rx) < 0.01 && Math.abs(c.ry - t.ry) < 0.01;
      setPos({ rx: done ? t.rx : c.rx, ry: done ? t.ry : c.ry });
      if (done) { runningRef.current = false; return; }
      rafRef.current = requestAnimationFrame(tick);
    }
    function kick() {
      if (reduce || runningRef.current) return;
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(tick);
    }

    function onMove(e: MouseEvent | TouchEvent) {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let cx: number, cy: number;
      if ("touches" in e) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      const x = ((cx - rect.left) / rect.width - 0.5) * 2;
      const y = ((cy - rect.top) / rect.height - 0.5) * 2;
      targetRef.current = { rx: -y * 14, ry: x * 18 };
      kick();
    }

    function onLeave() {
      targetRef.current = { rx: 0, ry: 0 };
      kick();
    }

    const el = containerRef.current;
    el?.addEventListener("mousemove", onMove);
    el?.addEventListener("touchmove", onMove as EventListener, { passive: true });
    el?.addEventListener("mouseleave", onLeave);
    el?.addEventListener("touchend", onLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      el?.removeEventListener("mousemove", onMove);
      el?.removeEventListener("touchmove", onMove as EventListener);
      el?.removeEventListener("mouseleave", onLeave);
      el?.removeEventListener("touchend", onLeave);
    };
  }, []);

  // Reveal the hero copy as the reload curtain lifts (or shortly after mount on a
  // client navigation / if the curtain never fires).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setReduceMo(true); setRevealed(true); return; }
    const fire = () => setRevealed(true);
    window.addEventListener("ag-curtain-lift", fire);
    const t = setTimeout(fire, 750); // fallback when there's no curtain
    return () => { window.removeEventListener("ag-curtain-lift", fire); clearTimeout(t); };
  }, []);

  const shadowX = (pos.ry / 18) * 24;
  const shadowY = -(pos.rx / 14) * 16;

  // ── Reveal helpers ──────────────────────────────────────────
  const maskStyle: CSSProperties = { display: "block", overflow: "hidden" };
  // Masked line reveal (headline) — inner slides up from behind the mask.
  const line = (delay: number): CSSProperties => ({
    display: "block",
    transform: revealed ? "translateY(0)" : "translateY(110%)",
    transition: reduceMo ? "none" : `transform 0.95s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
    willChange: "transform",
  });
  // Softer fade-up for supporting copy.
  const fadeUp = (delay: number): CSSProperties => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? "translateY(0)" : "translateY(22px)",
    transition: reduceMo ? "none" : `opacity 0.7s ease ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section
      ref={containerRef}
      className="relative flex flex-col justify-end overflow-hidden select-none"
      style={{
        minHeight: "100svh",
        background: "linear-gradient(160deg, #0b0b14 0%, #12103a 55%, #1a0d2e 100%)",
        cursor: "crosshair",
      }}
    >
      {/* Real WebGL silk background */}
      <div className="absolute inset-0">
        <HeroFabricCanvas />
      </div>

      {/* Legibility scrim — keeps the headline readable over the cloth */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg, rgba(11,11,20,0.78) 0%, rgba(11,11,20,0.45) 38%, rgba(11,11,20,0) 70%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(11,11,20,0.9), transparent)" }} />

      {/* ── 3D Floating Card — desktop right side ──────────────── */}
      <div
        ref={cardRef}
        className="hidden md:flex absolute right-16 top-1/2 -translate-y-1/2 items-center justify-center"
        style={{
          perspective: "1000px",
          width: "340px",
          height: "420px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transform: `rotateX(${pos.rx}deg) rotateY(${pos.ry}deg)`,
            transition: "box-shadow 0.1s",
            borderRadius: "24px",
            boxShadow: `${shadowX}px ${shadowY + 24}px 60px rgba(0,0,0,0.6), ${shadowX / 2}px ${shadowY / 2 + 10}px 20px rgba(201,168,76,0.15)`,
            background: "linear-gradient(145deg, #1a1230, #0d0b1e)",
            border: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}
        >
          {/* Specular highlight that moves with tilt */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "24px",
            background: `radial-gradient(circle at ${50 + pos.ry * 2}% ${50 - pos.rx * 2}%, rgba(255,255,255,0.06) 0%, transparent 60%)`,
          }} />
          {/* Gold top edge */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
            background: `linear-gradient(90deg, transparent, #c9a84c ${50 + pos.ry * 3}%, transparent)`,
          }} />
          {/* Card content */}
          <div style={{ position: "relative", zIndex: 1, padding: "36px 32px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "rgba(201,168,76,0.7)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px" }}>
                SS 2026
              </p>
              {/* T-shirt SVG illustration */}
              <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: "200px", margin: "0 auto", display: "block" }}>
                <path d="M55 30 L30 70 L65 80 L65 170 L155 170 L155 80 L190 70 L165 30 L140 50 C135 60 130 65 110 65 C90 65 85 60 80 50 Z"
                  fill="rgba(201,168,76,0.08)" stroke="rgba(201,168,76,0.4)" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M80 50 C85 60 90 65 110 65 C130 65 135 60 140 50"
                  fill="none" stroke="rgba(201,168,76,0.6)" strokeWidth="1" />
                {/* Seam lines */}
                <line x1="110" y1="65" x2="110" y2="170" stroke="rgba(201,168,76,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="65" y1="80" x2="155" y2="80" stroke="rgba(201,168,76,0.15)" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: 700, color: "#faf7f0", lineHeight: 1.2, marginBottom: "8px" }}>
                Premium<br />Collection
              </p>
              <p style={{ fontSize: "12px", color: "rgba(250,247,240,0.35)", marginBottom: "16px" }}>
                220 GSM Supima Blend
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {[1,2,3,4,5].map(i => (
                  <span key={i} style={{ color: "#c9a84c", fontSize: "12px" }}>★</span>
                ))}
                <span style={{ color: "rgba(250,247,240,0.35)", fontSize: "11px", marginLeft: "4px" }}>4.9 / 5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating badges */}
        <div className="absolute -top-4 -left-8"
          style={{
            background: "#c9a84c", color: "#0b0b14", borderRadius: "12px", padding: "8px 14px",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em",
            transform: `translateZ(40px) rotate(-4deg) rotateX(${pos.rx * 0.3}deg) rotateY(${pos.ry * 0.3}deg)`,
            boxShadow: "0 8px 24px rgba(201,168,76,0.4)",
          }}>
          ✦ New Drop
        </div>
        <div className="absolute -bottom-3 -right-6"
          style={{
            background: "rgba(11,11,20,0.9)", color: "#faf7f0",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px", padding: "8px 14px",
            fontSize: "11px", fontWeight: 600,
            transform: `translateZ(30px) rotate(3deg)`,
            backdropFilter: "blur(10px)",
          }}>
          Free Shipping ৳2k+
        </div>
      </div>

      {/* ── Mobile floating 3D pill cards ──────────────────────── */}
      <div className="md:hidden absolute top-24 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="px-3 py-2 rounded-xl text-[10px] font-bold"
          style={{
            background: "#c9a84c", color: "#0b0b14",
            transform: `rotate(-3deg) rotateX(${pos.rx * 0.5}deg)`,
            boxShadow: "0 4px 16px rgba(201,168,76,0.35)",
          }}>
          ✦ SS 2025
        </div>
        <div className="px-3 py-2 rounded-xl text-[10px] font-semibold"
          style={{
            background: "rgba(255,255,255,0.06)", color: "rgba(250,247,240,0.7)",
            border: "1px solid rgba(255,255,255,0.08)",
            transform: `rotate(2deg)`,
            backdropFilter: "blur(8px)",
          }}>
          4.9★ Rated
        </div>
      </div>

      {/* ── Text Content ───────────────────────────────────────── */}
      <div className="relative z-10 px-5 pb-14 pt-28 md:px-14 md:pb-24 max-w-[1280px] mx-auto w-full">
        <div className="md:max-w-[50%]">
          {/* Tag */}
          <div className="flex items-center gap-2.5 mb-7" style={fadeUp(0)}>
            <span className="block w-6 h-px shrink-0" style={{ background: "#c9a84c" }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "#c9a84c" }}>
              New Season · SS 2026
            </span>
          </div>

          {/* Headline — masked line reveal */}
          <h1 className="font-['Playfair_Display'] font-bold leading-[0.95] tracking-[-0.02em] mb-6"
            style={{ fontSize: "clamp(3rem, 12vw, 7rem)", color: "#faf7f0" }}>
            <span style={maskStyle}><span style={line(0.08)}>Wear Less.</span></span>
            <span style={maskStyle}>
              <span style={line(0.18)}><em style={{ color: "#c9a84c", fontStyle: "italic" }}>Mean</em> More.</span>
            </span>
          </h1>

          <p className="text-[15px] leading-relaxed mb-8 max-w-xs md:max-w-sm"
            style={{ color: "rgba(250,247,240,0.5)", ...fadeUp(0.32) }}>
            Premium clothing for those who let quality speak louder than logos. Each piece crafted with intention.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3" style={fadeUp(0.42)}>
            <Link href="/shop"
              className="flex items-center justify-center gap-2.5 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.15em] rounded-full transition-all active:scale-95"
              style={{ background: "#c9a84c", color: "#0b0b14" }}>
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              Shop Collection
            </Link>
            <Link href="/shop?sort=newest"
              className="flex items-center justify-center gap-2.5 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.15em] rounded-full transition-all active:scale-95"
              style={{ border: "1px solid rgba(250,247,240,0.2)", color: "rgba(250,247,240,0.75)" }}>
              New Arrivals
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          {/* Scroll hint */}
          <div className="flex items-center gap-2 mt-10"
            style={{
              opacity: revealed ? 0.4 : 0,
              transform: revealed ? "translateY(0)" : "translateY(22px)",
              transition: reduceMo ? "none" : "opacity 0.7s ease 0.55s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.55s",
            }}>
            <span className="material-symbols-outlined text-base animate-bounce" style={{ color: "#c9a84c" }}>keyboard_arrow_down</span>
            <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#c9a84c" }}>Scroll to explore</span>
          </div>
        </div>

        {/* Hint text for desktop interaction */}
        {mounted && (
          <p className="hidden md:block absolute bottom-8 right-14 text-[10px] uppercase tracking-[0.25em] opacity-30 transition-opacity"
            style={{ color: "#c9a84c" }}>
            Move cursor to interact ·
          </p>
        )}
      </div>

      {/* Bottom rule */}
      <div className="absolute bottom-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(201,168,76,0.4),transparent)" }} />
    </section>
  );
}
