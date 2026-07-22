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
      className="py-14 md:py-28 overflow-hidden bg-canvas"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-14">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 md:mb-14">
          <div>
            <p className="dd-eyebrow text-fg-subtle mb-2">What they say</p>
            <h2 className="dd-display text-fg" style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)" }}>
              Worn &amp; loved
            </h2>
          </div>
          {reviews.length > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => manualNav(prev)} aria-label="Previous"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 border border-line-strong text-fg-muted hover:text-fg">
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
              <button onClick={() => manualNav(next)} aria-label="Next"
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 bg-accent text-accent-fg">
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
          <div className="relative overflow-hidden bg-surface border border-line"
            style={{ minHeight: "240px", borderRadius: "var(--radius-card)" }}>

            {/* Progress bar */}
            {reviews.length > 1 && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-line">
                <div
                  key={active}
                  className="h-full bg-accent"
                  style={{ animation: paused ? "none" : `progress-bar ${AUTO_INTERVAL}ms linear forwards` }}
                />
              </div>
            )}

            <div className="p-7 md:p-12">
              {/* Stars */}
              <div className="flex items-center gap-1 mb-4 text-fg-subtle">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"
                    fill={i < review.rating ? "var(--accent)" : "none"} stroke="currentColor" strokeWidth="1.2">
                    <path d="m10 2 2.4 5.1 5.6.8-4 4 .9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-4 5.6-.8z" />
                  </svg>
                ))}
              </div>

              {/* Title */}
              {review.title && (
                <p className="dd-display text-fg text-[1.15rem] md:text-[1.5rem] leading-snug mb-3">
                  {review.title}
                </p>
              )}

              {/* Body */}
              <p className="text-[0.9rem] md:text-[1.05rem] leading-relaxed text-fg-muted">
                {review.body}
              </p>

              {/* Author + product */}
              <div className="flex items-center justify-between mt-7 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-accent-tint text-accent border border-accent/25">
                    {authorInitial}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-fg">
                      {review.user?.name ?? "Verified Buyer"}
                    </p>
                    <p className="text-[11px] text-fg-subtle">
                      {new Date(review.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                {review.product && (
                  <span className="text-[10px] font-medium px-3 py-1.5 rounded-[var(--radius-pill)] bg-surface-raised text-fg-subtle border border-line">
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
            <span className="text-[11px] font-medium text-fg-subtle">
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
