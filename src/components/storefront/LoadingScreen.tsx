"use client";

/**
 * LoadingScreen — the agency-style ink curtain (à la outfit.hellohello.is).
 *
 * One component handles every "loading" moment in the storefront:
 *   • First visit / hard reload — renders covering on the server so the page's
 *     own skeletons never flash, then lifts once content is ready.
 *   • Client navigation — intercepts internal <Link>/<a> clicks, sweeps the
 *     curtain up to cover, navigates behind it, then lifts on arrival.
 *
 * Crucially it stays up until the destination's *content* has loaded, not just
 * its route shell: pages that fetch on the client raise `pageLoading` (via
 * usePageContentLoading), and the curtain waits for that to clear. Pages with
 * no client fetch simply lift after a short minimum display time.
 *
 * Respects prefers-reduced-motion and locks scroll while covering.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { pageLoading } from "./pageLoading";

const REVEAL_MS = 720;  // curtain lifts away
const SETTLE_MS = 140;  // let the destination register its content-loading state
const MIN_FIRST = 600;  // brief first-visit intro; lifts as soon as content is ready
const MIN_RELOAD = 0;   // no artificial hold on reload — never delay the real page
const RAMP_MS = 1600;   // counter ramp 0 → ~90 while waiting
const SAFETY_MS = 8000; // never strand the user behind the curtain

const LOADING_PHRASES = [
  "Entering the goli...",
  "Charging your aura...",
  "Weaving premium cotton...",
  "Adjusting the vibe...",
];

type Phase = "cover" | "reveal" | "idle";
type Slide = "down" | "in" | "up";

export default function LoadingScreen() {
  const pathname = usePathname();

  // Start covering on first paint (SSR) so a hard load/reload never flashes the
  // page's own skeletons before the curtain is up.
  const [phase, setPhase] = useState<Phase>("cover");
  const [slide, setSlide] = useState<Slide>("in");
  const [count, setCount] = useState(0);
  const [phrase, setPhrase] = useState(LOADING_PHRASES[0]);
  // Mirrors prefers-reduced-motion for the render path; the ref version is used
  // inside callbacks. Starts false so SSR and first client render match.
  const [reduce, setReduce] = useState(false);

  const modeRef = useRef<"initial" | "click">("initial");
  const targetRef = useRef<string | null>(null);
  const arrivedRef = useRef(false);
  const gatingRef = useRef(false);
  const coverStartRef = useRef(0);
  const minVisibleRef = useRef(MIN_RELOAD);
  const reduceRef = useRef(false);

  const rafRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const unsubRef = useRef<null | (() => void)>(null);

  const after = (ms: number, fn: () => void) => {
    timersRef.current.push(setTimeout(fn, ms));
  };
  const clearAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    cancelAnimationFrame(rafRef.current);
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
  }, []);

  const startCounter = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (reduceRef.current) {
      setCount(99);
      return;
    }
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 2.4);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / RAMP_MS);
      setCount(Math.round(ease(t) * 90));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const reveal = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    setCount(100);
    setPhase("reveal");
    setSlide("up");
    after(reduceRef.current ? 0 : REVEAL_MS, () => {
      setPhase("idle");
      setSlide("in");
      setCount(0);
      document.body.style.overflow = "";
      modeRef.current = "click";
      arrivedRef.current = false;
      gatingRef.current = false;
    });
  }, []);

  const finishWithMin = useCallback(() => {
    const elapsed = performance.now() - coverStartRef.current;
    after(Math.max(0, minVisibleRef.current - elapsed), reveal);
  }, [reveal]);

  // Hold the curtain until the destination's content has finished loading.
  const gateOnContent = useCallback(() => {
    if (gatingRef.current) return;
    gatingRef.current = true;
    after(SETTLE_MS, () => {
      if (pageLoading.pending === 0) {
        finishWithMin(); // static page — content already present
        return;
      }
      unsubRef.current = pageLoading.subscribe(() => {
        if (pageLoading.pending === 0) {
          if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
          }
          finishWithMin();
        }
      });
    });
  }, [finishWithMin]);

  // Initial load / hard reload.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduceMotion;
    if (reduceMotion) setReduce(true);
    setPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
    modeRef.current = "initial";
    coverStartRef.current = performance.now();
    const firstVisit = !sessionStorage.getItem("ag_intro_done");
    sessionStorage.setItem("ag_intro_done", "1");
    minVisibleRef.current = firstVisit ? MIN_FIRST : MIN_RELOAD;
    document.body.style.overflow = "hidden";
    startCounter();
    gateOnContent();
    after(SAFETY_MS, reveal);
    return () => clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arrival after a click navigation: the destination route has mounted.
  useEffect(() => {
    if (phase !== "cover" || modeRef.current !== "click" || arrivedRef.current) return;
    if (targetRef.current && pathname !== targetRef.current) return;
    arrivedRef.current = true;
    gateOnContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, phase]);

  // NOTE: internal link clicks are intentionally NOT intercepted. Client
  // navigations use Next.js routing directly (instant, no artificial gate) so
  // we never add latency to INP. The curtain is a first-load/reload intro only.

  if (phase === "idle") return null;

  const translateY = slide === "up" ? "-100%" : slide === "down" ? "100%" : "0";
  const transition =
    !reduce && slide === "up"
      ? `transform ${REVEAL_MS}ms cubic-bezier(0.76, 0, 0.24, 1)`
      : "none";
  const padded = String(count).padStart(3, "0");

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        background: "#0b0b14",
        transform: `translateY(${translateY})`,
        transition,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "clamp(20px, 4vw, 48px)",
        overflow: "hidden",
      }}
    >
      {/* Ambient gold glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(201,168,76,0.14), transparent 70%)",
        }}
      />

      {/* Top: brand mark */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
        <Image src="/logo-mark.png" alt="Aura Goli" width={27} height={30} priority style={{ height: 30, width: "auto" }} />
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.1rem, 2.6vw, 1.6rem)",
            fontWeight: 700,
            color: "#faf7f0",
            letterSpacing: "0.02em",
          }}
        >
          Aura <span style={{ color: "#c9a84c" }}>Goli</span>
        </span>
      </div>

      {/* Middle: rotating brand phrase */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          padding: "0 24px",
        }}
      >
        <span
          key={phrase}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.4rem, 4.5vw, 2.4rem)",
            fontWeight: 600,
            fontStyle: "italic",
            color: "rgba(250,247,240,0.92)",
            textAlign: "center",
            letterSpacing: "0.01em",
            animation: reduce ? "none" : "ag-phrase-in 0.7s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          {phrase}
        </span>
      </div>
      <style>{`@keyframes ag-phrase-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }`}</style>

      {/* Bottom: counter + progress line */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
          <span
            style={{
              fontSize: "clamp(0.6rem, 1.6vw, 0.75rem)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              color: "rgba(250,247,240,0.4)",
            }}
          >
            Crafting your wardrobe
          </span>
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(3.5rem, 14vw, 9rem)",
              fontWeight: 700,
              lineHeight: 0.9,
              color: "#faf7f0",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {padded}
            <span style={{ color: "#c9a84c" }}>%</span>
          </span>
        </div>
        {/* Progress line */}
        <div style={{ height: 2, width: "100%", background: "rgba(250,247,240,0.1)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${count}%`,
              background: "linear-gradient(90deg, #c9a84c, #e6c976)",
              transition: "width 0.12s linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}
