"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "var(--danger-tint)" }}>
          <span className="material-symbols-outlined text-4xl" style={{ color: "var(--danger)" }}>error</span>
        </div>
        <h1 className="dd-display text-3xl text-fg mb-3">Something went wrong</h1>
        <p className="text-fg-muted mb-8">
          An unexpected error occurred. Our team has been notified. Please try again or return to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset}
            className="inline-flex items-center justify-center gap-2 border border-line-strong text-fg px-6 py-3 font-medium text-sm uppercase tracking-widest hover:bg-surface transition-colors">
            <span className="material-symbols-outlined text-base">refresh</span>
            Try Again
          </button>
          <Link href="/"
            className="inline-flex items-center justify-center gap-2 bg-accent text-accent-fg px-6 py-3 font-medium text-sm uppercase tracking-widest hover:bg-accent-hover transition-colors">
            <span className="material-symbols-outlined text-base">home</span>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
