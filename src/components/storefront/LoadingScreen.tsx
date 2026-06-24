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
import { usePathname, useRouter } from "next/navigation";
import { pageLoading } from "./pageLoading";

const REVEAL_MS = 720;  // curtain lifts away
const SETTLE_MS = 140;  // let the destination register its content-loading state
const MIN_FIRST = 1500; // min visible on the very first visit (intro feel)
const MIN_RELOAD = 750; // min visible on a hard reload
const MIN_CLICK = 650;  // min visible on a client navigation
const RAMP_MS = 1600;   // counter ramp 0 → ~90 while waiting
const SAFETY_MS = 8000; // never strand the user behind the curtain

type Phase = "cover" | "reveal" | "idle";
type Slide = "down" | "in" | "up";

export default function LoadingScreen() {
  const router = useRouter();
  const pathname = usePathname();

  // Start covering on first paint (SSR) so a hard load/reload never flashes the
  // page's own skeletons before the curtain is up.
  const [phase, setPhase] = useState<Phase>("cover");
  const [slide, setSlide] = useState<Slide>("in");
  const [count, setCount] = useState(0);
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

  // Begin a curtain for an internal link click.
  const beginClick = useCallback(
    (href: string) => {
      clearAll();
      gatingRef.current = false;
      arrivedRef.current = false;
      modeRef.current = "click";
      targetRef.current = new URL(href, window.location.href).pathname;
      minVisibleRef.current = MIN_CLICK;
      coverStartRef.current = performance.now();
      setCount(0);
      document.body.style.overflow = "hidden";
      setPhase("cover");
      // Cover instantly (no rAF dependency) so the curtain reliably hides the
      // destination even when the main thread is busy rendering it. The elegant
      // sweep is kept for the reveal.
      setSlide("in");
      startCounter();
      router.push(href);
      after(SAFETY_MS, reveal);
    },
    [router, startCounter, reveal, clearAll]
  );

  // Intercept internal link clicks app-wide (capture phase, before Next's <Link>).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (phase !== "idle") return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.hasAttribute("download") || a.dataset.noTransition !== undefined) return;
      const target = a.getAttribute("target");
      if (target && target !== "_self") return;
      const raw = a.getAttribute("href");
      if (!raw || raw.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;     // external / mailto / tel
      if (url.pathname === window.location.pathname) return;  // same page (hash / query only)
      e.preventDefault();
      beginClick(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [phase, beginClick]);

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
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ display: "block", width: 28, height: 1, background: "#c9a84c" }} />
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
