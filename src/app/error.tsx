"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#faf7f0" }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(186,26,26,0.08)" }}>
          <span className="material-symbols-outlined text-4xl" style={{ color: "#ba1a1a" }}>error</span>
        </div>
        <h1 className="font-['Playfair_Display'] text-3xl font-bold text-black mb-3">Something went wrong</h1>
        <p className="text-[#747878] mb-8">
          An unexpected error occurred. Our team has been notified. Please try again or return to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset}
            className="inline-flex items-center justify-center gap-2 border border-black text-black px-6 py-3 font-bold text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
            <span className="material-symbols-outlined text-base">refresh</span>
            Try Again
          </button>
          <Link href="/"
            className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 font-bold text-sm uppercase tracking-widest hover:bg-[#5951b4] transition-colors">
            <span className="material-symbols-outlined text-base">home</span>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
