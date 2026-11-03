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

const AUTO_INTERVAL = 6000;

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
      className="relative py-16 md:py-32 overflow-hidden bg-canvas"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div aria-hidden="true" className="absolute inset-0 ag-glow ag-glow--left" />
      <div className="relative max-w-[1280px] mx-auto px-5 md:px-14">

        {/* Header */}
        <div className="flex items-end justify-between mb-10 md:mb-16">
          <div>
            <p className="dd-eyebrow text-fg-subtle mb-3">What they say</p>
            <h2 className="dd-display text-fg" style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)" }}>
              Worn &amp; <span style={{ fontStyle: "italic" }}>loved</span>
            </h2>
          </div>
          {reviews.length > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => manualNav(prev)} aria-label="Previous"
                className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 border border-line-strong text-fg-muted hover:text-fg hover:border-fg">
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
              <button onClick={() => manualNav(next)} aria-label="Next"
                className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 bg-accent text-accent-fg hover:bg-accent-hover">
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          )}
        </div>

        {/* Quote */}
        <div
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) manualNav(diff > 0 ? next : prev);
          }}
        >
          <div className="relative overflow-hidden bg-surface border border-line"
            style={{ minHeight: "280px", borderRadius: "var(--radius-card)" }}>

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

            {/* Oversized opening quote, set in the serif as a watermark */}
            <span aria-hidden="true" className="dd-display absolute -top-6 left-5 md:left-10 text-accent select-none pointer-events-none"
              style={{ fontSize: "clamp(8rem, 18vw, 14rem)", lineHeight: 1, opacity: 0.12 }}>
              “
            </span>

            <div key={review.id} className="dd-rise relative p-7 pt-14 md:p-14 md:pt-20 md:pr-20">
              {/* Stars */}
              <div className="flex items-center gap-1 mb-6 text-fg-subtle">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"
                    fill={i < review.rating ? "var(--accent)" : "none"} stroke="currentColor" strokeWidth="1.2">
                    <path d="m10 2 2.4 5.1 5.6.8-4 4 .9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-4 5.6-.8z" />
                  </svg>
                ))}
                {review.title && (
                  <span className="dd-eyebrow text-fg-muted ml-3">{review.title}</span>
                )}
              </div>

              {/* Body — the quote is the headline here */}
              <blockquote className="dd-display text-fg max-w-4xl"
                style={{ fontSize: "clamp(1.45rem, 3vw, 2.4rem)", lineHeight: 1.2 }}>
                {review.body}
              </blockquote>

              {/* Author + product */}
              <div className="flex items-center justify-between mt-9 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-accent-tint text-accent border border-accent/25">
                    {authorInitial}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-fg">
                      {review.user?.name ?? "Verified Buyer"}
                    </p>
                    <p className="text-[11px] text-fg-subtle">
                      Verified buyer · {new Date(review.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
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
          <div className="flex items-center justify-center gap-2 mt-6">
            {reviews.map((r, i) => (
              <button key={r.id} onClick={() => manualNav(() => setActive(i))} aria-label={`Review ${i + 1}`}
                className={`h-1 rounded-full transition-all duration-500 ${i === active ? "w-8 bg-accent" : "w-2 bg-line-strong"}`} />
            ))}
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
