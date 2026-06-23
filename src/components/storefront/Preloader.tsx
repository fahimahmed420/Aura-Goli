"use client";

/**
 * Preloader — agency-style site intro (à la outfit.hellohello.is).
 *
 * A full-screen ink curtain with the brand mark and a 000→100 counter that
 * fills a progress line, then slides up to reveal the page. Shows once per
 * browser session, respects prefers-reduced-motion, and locks scroll while active.
 */

import { useEffect, useRef, useState } from "react";

const DURATION = 1500; // ms for the count-up

export default function Preloader() {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<"counting" | "leaving" | "done">("counting");
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    // Only once per session.
    if (sessionStorage.getItem("ag_preloaded")) {
      setPhase("done");
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sessionStorage.setItem("ag_preloaded", "1");

    if (reduce) {
      setCount(100);
      const t = setTimeout(() => setPhase("done"), 300);
      return () => clearTimeout(t);
    }

    // Lock scroll while the curtain is up.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let raf = 0;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 2.2);

    function tick(now: number) {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / DURATION);
      setCount(Math.round(easeOut(t) * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // brief hold, then raise the curtain
        setTimeout(() => setPhase("leaving"), 220);
        setTimeout(() => {
          setPhase("done");
          document.body.style.overflow = prevOverflow;
        }, 220 + 900);
      }
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (phase === "done") return null;

  const padded = String(count).padStart(3, "0");

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        background: "#0b0b14",
        transform: phase === "leaving" ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 0.9s cubic-bezier(0.76, 0, 0.24, 1)",
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
              transition: "width 0.1s linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}
