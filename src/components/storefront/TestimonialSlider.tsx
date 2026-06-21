"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  user: { name: string } | null;
  product: { name: string } | null;
}

const AUTO_INTERVAL = 5000;

export default function TestimonialSlider({ reviews }: { reviews: Review[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prev = useCallback(() => setActive((a) => (a === 0 ? reviews.length - 1 : a - 1)), [reviews.length]);
  const next = useCallback(() => setActive((a) => (a === reviews.length - 1 ? 0 : a + 1)), [reviews.length]);

  /* auto-advance */
  useEffect(() => {
    if (reviews.length <= 1 || paused) return;
    timerRef.current = setInterval(next, AUTO_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, paused, reviews.length]);

  function manualNav(fn: () => void) {
    if (timerRef.current) clearInterval(timerRef.current);
    fn();
    /* restart timer after manual interaction */
    if (!paused) {
      timerRef.current = setInterval(next, AUTO_INTERVAL);
    }
  }

  if (reviews.length === 0) return null;

  const review = reviews[active];
  const authorInitial = (review.user?.name ?? "V")[0].toUpperCase();

  return (
    <section
      className="py-14 md:py-28 overflow-hidden"
      style={{ background: "#faf7f0" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-14">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 md:mb-14">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: "#c9a84c" }}>
              What They Say
            </p>
            <h2 className="font-['Playfair_Display'] font-bold leading-tight"
              style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)", color: "#12103a" }}>
              Worn &amp; Loved
            </h2>
          </div>
          {reviews.length > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => manualNav(prev)} aria-label="Previous"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ border: "1.5px solid rgba(18,16,58,0.15)", color: "#12103a" }}>
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
              <button onClick={() => manualNav(next)} aria-label="Next"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: "#12103a", color: "#faf7f0" }}>
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          )}
        </div>

        {/* Card */}
        <div
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) manualNav(diff > 0 ? next : prev);
          }}
        >
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden"
            style={{ background: "#0b0b14", minHeight: "240px" }}>
            {/* Gold accent bar */}
            <div className="absolute top-0 left-0 w-1 bottom-0 rounded-l-2xl"
              style={{ background: "linear-gradient(to bottom, #c9a84c, rgba(201,168,76,0.2))" }} />

            {/* Progress bar */}
            {reviews.length > 1 && (
              <div className="absolute top-0 left-1 right-0 h-[2px]" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  key={active}
                  className="h-full"
                  style={{
                    background: "#c9a84c",
                    animation: paused ? "none" : `progress-bar ${AUTO_INTERVAL}ms linear forwards`,
                  }}
                />
              </div>
            )}

            <div className="p-7 md:p-12 pl-9 md:pl-14">
              {/* Stars */}
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: i < review.rating ? "#c9a84c" : "rgba(201,168,76,0.2)", fontSize: "15px" }}>★</span>
                ))}
              </div>

              {/* Title */}
              {review.title && (
                <p className="font-['Playfair_Display'] text-[1.15rem] md:text-[1.5rem] font-bold leading-snug mb-3"
                  style={{ color: "#faf7f0" }}>
                  {review.title}
                </p>
              )}

              {/* Body */}
              <div className="relative">
                <span className="absolute -top-3 -left-2 font-['Playfair_Display'] text-[4rem] leading-none select-none pointer-events-none"
                  style={{ color: "rgba(201,168,76,0.1)" }}>&ldquo;</span>
                <p className="text-[0.9rem] md:text-[1.05rem] leading-relaxed relative z-10"
                  style={{ color: "rgba(250,247,240,0.65)" }}>
                  {review.body}
                </p>
              </div>

              {/* Author + product */}
              <div className="flex items-center justify-between mt-7 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1.5px solid rgba(201,168,76,0.25)" }}>
                    {authorInitial}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: "#faf7f0" }}>
                      {review.user?.name ?? "Verified Buyer"}
                    </p>
                    <p className="text-[11px]" style={{ color: "rgba(250,247,240,0.3)" }}>
                      {new Date(review.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                {review.product && (
                  <span className="text-[10px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(201,168,76,0.08)", color: "rgba(201,168,76,0.55)", border: "1px solid rgba(201,168,76,0.14)" }}>
                    {review.product.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Counter */}
        {reviews.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-5">
            <span className="text-[11px] font-semibold" style={{ color: "rgba(18,16,58,0.3)" }}>
              {active + 1} / {reviews.length}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes progress-bar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </section>
  );
}
