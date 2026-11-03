"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { getCurrentSeason } from "@/lib/season";

// Real WebGL silk background — loaded client-side only, never blocks first paint.
const HeroFabricCanvas = dynamic(() => import("./HeroFabricCanvas"), { ssr: false });

/** The piece shown on the floating card. Passed from the home page (top bestseller). */
export interface HeroFeatured {
  name: string;
  slug: string;
  price: number;
  image?: string;
  category?: string;
}

export default function Hero3D({ featured }: { featured?: HeroFeatured }) {
  const season = getCurrentSeason();
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
  const maskStyle: CSSProperties = { display: "block", overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em" };
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
  // The product card floats in from the right, slightly later than the copy.
  const cardIn = (delay: number): CSSProperties => ({
    opacity: revealed ? 1 : 0,
    transform: revealed ? "none" : "translateY(40px) scale(0.96)",
    transition: reduceMo ? "none" : `opacity 0.9s ease ${delay}s, transform 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  const price = featured ? `৳${featured.price.toLocaleString("en-BD")}` : null;

  return (
    <section
      ref={containerRef}
      className="relative flex flex-col justify-end overflow-hidden select-none bg-canvas"
      style={{ minHeight: "100svh", cursor: "crosshair" }}
    >
      {/* ── Background stack ───────────────────────────────────
          1. CSS gradient mesh + aurora: complete on first paint, no JS.
          2. WebGL silk: lazy, sits on top and takes over when it loads.
          3. Grain + vignette: always on top, ties both layers together. */}
      <div aria-hidden="true" className="absolute inset-0 ag-hero-mesh" />
      <div aria-hidden="true" className="ag-hero-aurora" />
      <div className="absolute inset-0">
        <HeroFabricCanvas />
      </div>
      <div aria-hidden="true" className="absolute inset-0 ag-grain" />
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none ag-hero-vignette" />

      {/* Legibility scrim — keeps the headline readable over the cloth */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--canvas) 78%, transparent) 0%, color-mix(in srgb, var(--canvas) 45%, transparent) 38%, transparent 70%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
        style={{ background: "linear-gradient(to top, var(--canvas), transparent)" }} />

      {/* ── 3D floating product card — desktop right side ─────── */}
      <div
        ref={cardRef}
        className="hidden md:flex absolute right-[7%] top-1/2 -translate-y-1/2 items-center justify-center"
        style={{ perspective: "1100px", width: "min(380px, 28vw)", aspectRatio: "3 / 4", ...cardIn(0.35) }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transform: `rotateX(${pos.rx}deg) rotateY(${pos.ry}deg)`,
            borderRadius: "var(--radius-card)",
            boxShadow: `${shadowX}px ${shadowY + 30}px 70px rgba(0,0,0,0.65), ${shadowX / 2}px ${shadowY / 2 + 10}px 24px rgba(201,168,76,0.14)`,
            background: "var(--surface)",
            border: "1px solid var(--line-strong)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {featured?.image ? (
            <Image src={featured.image} alt={featured.name} fill priority sizes="380px" className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-10">
              <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                <path d="M55 30 L30 70 L65 80 L65 170 L155 170 L155 80 L190 70 L165 30 L140 50 C135 60 130 65 110 65 C90 65 85 60 80 50 Z"
                  fill="var(--surface-raised)" stroke="var(--line-strong)" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M80 50 C85 60 90 65 110 65 C130 65 135 60 140 50" fill="none" stroke="var(--line-strong)" strokeWidth="1" />
                <line x1="110" y1="65" x2="110" y2="170" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="65" y1="80" x2="155" y2="80" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
          )}
          {/* Specular highlight that moves with tilt */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `radial-gradient(circle at ${50 + pos.ry * 2}% ${50 - pos.rx * 2}%, rgba(255,255,255,0.10) 0%, transparent 55%)`,
          }} />
          {/* Gold top edge — the card's one accent moment */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
            background: `linear-gradient(90deg, transparent, var(--accent) ${50 + pos.ry * 3}%, transparent)`,
          }} />
          {/* Caption */}
          <div className="absolute inset-x-0 bottom-0 p-6 pt-20"
            style={{ background: "linear-gradient(to top, rgba(11,11,20,0.92) 30%, transparent)" }}>
            <p className="dd-eyebrow text-fg-subtle mb-2">{featured?.category ?? season}</p>
            <div className="flex items-end justify-between gap-3">
              <p className="dd-display text-fg" style={{ fontSize: "1.5rem", lineHeight: 1.1 }}>
                {featured?.name ?? "Premium Collection"}
              </p>
              {price && <p className="dd-display text-accent shrink-0" style={{ fontSize: "1.25rem" }}>{price}</p>}
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} viewBox="0 0 20 20" width="11" height="11" fill="var(--accent)" aria-hidden="true">
                  <path d="m10 2 2.4 5.1 5.6.8-4 4 .9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-4 5.6-.8z" />
                </svg>
              ))}
              <span className="text-fg-subtle" style={{ fontSize: "11px", marginLeft: "4px" }}>4.9 / 5</span>
            </div>
          </div>
          {featured && <Link href={`/products/${featured.slug}`} aria-label={`View ${featured.name}`} className="absolute inset-0" />}
        </div>

        {/* Floating badges */}
        <div className="absolute -top-4 -left-8 bg-accent text-accent-fg"
          style={{
            borderRadius: "10px", padding: "8px 14px",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em",
            transform: `translateZ(40px) rotate(-4deg) rotateX(${pos.rx * 0.3}deg) rotateY(${pos.ry * 0.3}deg)`,
            boxShadow: "0 8px 24px rgba(201,168,76,0.35)",
          }}>
          New drop
        </div>
        <div className="absolute -bottom-3 -right-6 bg-surface text-fg border border-line"
          style={{
            borderRadius: "10px", padding: "8px 14px",
            fontSize: "11px", fontWeight: 500,
            transform: `translateZ(30px) rotate(3deg)`,
          }}>
          Free shipping ৳2k+
        </div>
      </div>

      {/* ── Text Content ───────────────────────────────────────── */}
      <div className="relative z-10 px-5 pb-28 pt-24 md:px-14 md:pb-24 md:pt-28 max-w-[1280px] mx-auto w-full">
        {/* Phone: the product card sits in the flow above the copy, so it can
            never overlap the headline on a short screen. */}
        <div className="md:hidden flex items-start justify-end gap-3 mb-6 pr-2 pointer-events-none" style={cardIn(0.3)}>
          <div className="px-3 py-2 mt-2 rounded-xl text-[10px] font-bold bg-accent text-accent-fg"
            style={{ transform: `rotate(-4deg) rotateX(${pos.rx * 0.5}deg)`, boxShadow: "0 4px 16px rgba(201,168,76,0.3)" }}>
            {season}
          </div>
          {featured?.image && (
            <div className="relative overflow-hidden bg-surface border border-line-strong"
              style={{ width: "40vw", maxWidth: "180px", aspectRatio: "3 / 4", borderRadius: "var(--radius-card)",
                transform: `rotate(3deg) translateY(${pos.rx * -0.6}px)`, boxShadow: "0 24px 50px rgba(0,0,0,0.55)" }}>
              <Image src={featured.image} alt="" fill sizes="40vw" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 p-3 pt-10" style={{ background: "linear-gradient(to top, rgba(11,11,20,0.9), transparent)" }}>
                <p className="dd-display text-fg text-[0.95rem] leading-tight truncate">{featured.name}</p>
                <p className="dd-display text-accent text-[0.9rem] mt-0.5">{price}</p>
              </div>
            </div>
          )}
        </div>

        <div className="md:max-w-[56%]">
          {/* Tag — quiet, not gold: the eyebrow is a label, not an action */}
          <div className="flex items-center gap-2.5 mb-7" style={fadeUp(0)}>
            <span className="block w-6 h-px shrink-0 bg-accent" />
            <span className="dd-eyebrow text-fg-muted">
              New season · {season}
            </span>
          </div>

          {/* Headline — masked line reveal */}
          <h1 className="dd-display mb-7 text-fg" style={{ fontSize: "clamp(3.4rem, 13.5vw, 8.5rem)", lineHeight: 0.92 }}>
            <span style={maskStyle}><span style={line(0.08)}>Wear less.</span></span>
            <span style={maskStyle}>
              <span style={line(0.18)}><em className="text-accent" style={{ fontStyle: "italic" }}>Mean</em> more.</span>
            </span>
          </h1>

          <p className="text-[15px] md:text-[17px] leading-relaxed mb-9 max-w-xs md:max-w-md text-fg-muted"
            style={fadeUp(0.32)}>
            Premium clothing for those who let quality speak louder than logos. Each piece cut, sewn and finished with intention.
          </p>

          {/* CTAs — accent lives on the one action that matters */}
          <div className="flex flex-col sm:flex-row gap-3" style={fadeUp(0.42)}>
            <Link href="/shop"
              className="flex items-center justify-center gap-2.5 h-13 px-9 text-[12px] font-medium uppercase tracking-[0.18em] transition-all active:scale-95 bg-accent text-accent-fg hover:bg-accent-hover hover:shadow-[0_12px_40px_rgba(201,168,76,0.35)]"
              style={{ borderRadius: "var(--radius-pill)" }}>
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              Shop collection
            </Link>
            <Link href="/shop?sort=newest"
              className="flex items-center justify-center gap-2.5 h-13 px-9 text-[12px] font-medium uppercase tracking-[0.18em] transition-colors active:scale-95 border border-line-strong text-fg hover:bg-surface hover:border-fg"
              style={{ borderRadius: "var(--radius-pill)" }}>
              New arrivals
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          {/* Proof line */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-10 text-fg-subtle" style={fadeUp(0.55)}>
            <span className="flex items-center gap-2 text-[12px]">
              <span className="flex gap-0.5" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <svg key={i} viewBox="0 0 20 20" width="10" height="10" fill="var(--accent)"><path d="m10 2 2.4 5.1 5.6.8-4 4 .9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-4 5.6-.8z" /></svg>
                ))}
              </span>
              4.9 from 2,000+ reviews
            </span>
            <span className="hidden sm:inline text-[12px]">·</span>
            <span className="text-[12px]">Same-day delivery in Dhaka</span>
            <span className="hidden md:inline-flex items-center gap-2 text-[12px]">
              <span className="material-symbols-outlined text-base animate-bounce">keyboard_arrow_down</span>
              Scroll to explore
            </span>
          </div>
        </div>

        {/* Hint text for desktop interaction */}
        {mounted && (
          <p className="hidden md:block absolute bottom-8 right-14 dd-eyebrow text-fg-subtle opacity-40 transition-opacity">
            Move cursor to interact ·
          </p>
        )}
      </div>

      {/* Bottom rule */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-line" />
    </section>
  );
}
