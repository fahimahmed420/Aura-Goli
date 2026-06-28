"use client";

/**
 * PageTransition — agency-style "wipe-up" page transition for internal navigation
 * (à la outfit.hellohello.is).
 *
 *   1. Cover: an ink panel rises from the bottom to the top while the current
 *      page content is pushed up and off in lockstep — it reads as the panel
 *      shoving everything out the top.
 *   2. Navigate behind the panel; wait for the destination's content to load.
 *   3. Reveal: the panel continues upward and off the top, uncovering the new
 *      page (reset into place beneath it).
 *
 * Fires on internal link navigation (opt a link out with data-no-transition).
 * Respects prefers-reduced-motion (instant, no animation).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pageLoading } from "./pageLoading";

const COVER_MS = 620;   // panel rises to cover
const REVEAL_MS = 720;  // panel exits upward
const MIN_COVER_MS = 460; // keep the cover up at least this long so it reads
const SETTLE_MS = 120;  // let the destination register its loading state
const SAFETY_MS = 7000; // never strand the user behind the panel
const EASE = "cubic-bezier(0.76, 0, 0.24, 1)";

type Phase = "idle" | "cover" | "reveal";

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();

  const [phase, setPhase] = useState<Phase>("idle");
  const [y, setY] = useState("100%");          // panel translateY
  const [trans, setTrans] = useState("none");  // panel transition

  const targetRef = useRef<string | null>(null);
  const coverStartRef = useRef(0);
  const gatingRef = useRef(false);
  const reduceRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const unsub = useRef<null | (() => void)>(null);

  const after = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (unsub.current) { unsub.current(); unsub.current = null; }
  }, []);

  const mainEl = () => document.querySelector("main") as HTMLElement | null;

  const reveal = useCallback(() => {
    if (unsub.current) { unsub.current(); unsub.current = null; }
    // Snap the (new) content into place behind the panel, then lift the panel.
    const m = mainEl();
    if (m) { m.style.transition = "none"; m.style.transform = "translateY(0)"; }
    requestAnimationFrame(() => {
      setPhase("reveal");
      setTrans(reduceRef.current ? "none" : `transform ${REVEAL_MS}ms ${EASE}`);
      setY("-100%");
      after(reduceRef.current ? 0 : REVEAL_MS, () => {
        setPhase("idle");
        setTrans("none");
        setY("100%");
        document.body.style.overflow = "";
        gatingRef.current = false;
        if (m) { m.style.transition = ""; m.style.transform = ""; }
      });
    });
  }, []);

  // Hold the cover until the destination content has loaded (and a minimum time).
  const gate = useCallback(() => {
    if (gatingRef.current) return;
    gatingRef.current = true;
    after(SETTLE_MS, () => {
      const finish = () => {
        const elapsed = performance.now() - coverStartRef.current;
        after(Math.max(0, MIN_COVER_MS - elapsed), reveal);
      };
      if (pageLoading.pending === 0) { finish(); return; }
      unsub.current = pageLoading.subscribe(() => {
        if (pageLoading.pending === 0) {
          if (unsub.current) { unsub.current(); unsub.current = null; }
          finish();
        }
      });
    });
  }, [reveal]);

  const begin = useCallback((href: string) => {
    clearTimers();
    gatingRef.current = false;
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    targetRef.current = new URL(href, location.href).pathname;
    coverStartRef.current = performance.now();
    document.body.style.overflow = "hidden";

    // Place the panel just below the viewport, then rise to cover while pushing
    // the current page up in lockstep.
    setPhase("cover");
    setTrans("none");
    setY("100%");
    const m = mainEl();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTrans(reduceRef.current ? "none" : `transform ${COVER_MS}ms ${EASE}`);
        setY("0%");
        if (m && !reduceRef.current) {
          m.style.transition = `transform ${COVER_MS}ms ${EASE}`;
          m.style.transform = "translateY(-100vh)";
        }
      });
    });

    router.push(href);
    after(SAFETY_MS, reveal);
  }, [router, reveal, clearTimers]);

  // Start gating once the destination route has actually mounted.
  useEffect(() => {
    if (phase !== "cover") return;
    if (targetRef.current && pathname !== targetRef.current) return;
    gate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, phase]);

  // Intercept clicks on internal product links (capture phase, before <Link>).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (phase !== "idle") return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.hasAttribute("download") || a.getAttribute("target") || a.dataset.noTransition !== undefined) return;
      const raw = a.getAttribute("href");
      if (!raw || raw.startsWith("#")) return;
      let url: URL;
      try { url = new URL(a.href, location.href); } catch { return; }
      if (url.origin !== location.origin) return;     // external / mailto / tel
      if (url.pathname === location.pathname) return;  // same page (hash / query only)
      e.preventDefault();
      begin(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [phase, begin]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (phase === "idle") return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9985,
        background: "#0b0b14",
        transform: `translateY(${y})`,
        transition: trans,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        willChange: "transform",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(201,168,76,0.16), transparent 70%)",
        }}
      />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.6rem, 5vw, 2.6rem)",
            fontWeight: 700,
            color: "#faf7f0",
            letterSpacing: "0.02em",
          }}
        >
          Aura <span style={{ color: "#c9a84c" }}>Goli</span>
        </span>
        <span
          style={{
            display: "block",
            width: 36,
            height: 2,
            background: "linear-gradient(90deg, transparent, #c9a84c, transparent)",
            animation: reduceRef.current ? "none" : "ag-pt-pulse 1s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`@keyframes ag-pt-pulse { 0%,100% { opacity: 0.35; transform: scaleX(0.6); } 50% { opacity: 1; transform: scaleX(1); } }`}</style>
    </div>
  );
}
