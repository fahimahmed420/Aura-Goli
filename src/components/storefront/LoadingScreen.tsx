"use client";

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  isLoading: boolean;
}

/*
  The reload curtain. Previously three simultaneous loading indicators
  (spinner + percent counter + pulsing text) — collapsed to one: the wordmark
  and a single gold progress line, curtain lifts with the same reveal curve as
  the hero headline so the two moments read as one continuous entrance.
*/
export default function LoadingScreen({ isLoading }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(isLoading);
  const [shouldRender, setShouldRender] = useState(isLoading);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      setIsVisible(true);
      setProgress(0);

      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 30));
      }, 300);

      return () => clearInterval(interval);
    } else {
      setProgress(100);

      const timer = setTimeout(() => setIsVisible(false), 100);
      const unmountTimer = setTimeout(() => {
        setShouldRender(false);
        setProgress(0);
      }, 700);

      return () => {
        clearTimeout(timer);
        clearTimeout(unmountTimer);
      };
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas"
      style={{
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.95s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .curtain-mark { animation: none !important; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-8">
        <p className="dd-display curtain-mark text-fg text-[13vw] leading-none sm:text-[44px]" style={{ fontStyle: "italic" }}>
          Aura Goli
        </p>

        <div className="w-[200px] h-px bg-line overflow-hidden">
          <div
            className="h-full bg-accent"
            style={{ width: `${progress}%`, transition: "width 0.3s ease" }}
          />
        </div>
      </div>
    </div>
  );
}
