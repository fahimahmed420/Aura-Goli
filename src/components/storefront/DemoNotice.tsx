"use client";

import { useSyncExternalStore } from "react";

/*
  Portfolio disclosure. Aura Goli is a studio demo by Zordev, not a real brand:
  - DemoStrip: a slim notice above the flash-sale banner on every store page.
  - DemoPill:  a "Demo by Zordev" badge linking to the case study (desktop only;
    the phone layout is already full of floating buttons). Dismissible
    for this browser session; ?shots=1 hides it for screenshots.
*/

const CASE_STUDY = "https://www.zordev.com/work/aura-goli";
const KEY = "zordev-pill-hidden";
const listeners = new Set<() => void>();

function hiddenNow() {
  if (new URLSearchParams(window.location.search).has("shots")) return true;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function DemoStrip() {
  return (
    <div className="flex h-7 items-center justify-center truncate border-b border-line bg-canvas px-4 text-[11px] text-fg-muted">
      <span className="text-accent">Demo store</span>
      <span className="mx-1.5">·</span>
      <span className="truncate">
        <span className="sm:hidden">Not a real brand.</span>
        <span className="hidden sm:inline">Aura Goli is not a real brand and nothing here is for sale.</span>
      </span>
      <a href={`${CASE_STUDY}?utm_source=auragoli-demo&utm_medium=strip`} className="ml-1.5 shrink-0 underline underline-offset-2 hover:text-fg">
        Built by Zordev
      </a>
    </div>
  );
}

export function DemoPill() {
  const hidden = useSyncExternalStore(subscribe, hiddenNow, () => true);
  if (hidden) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    listeners.forEach((l) => l());
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 hidden items-center rounded-full border border-line bg-canvas/90 text-[12px] text-fg shadow-lg backdrop-blur md:flex">
      <a
        href={`${CASE_STUDY}?utm_source=auragoli-demo&utm_medium=badge`}
        className="group inline-flex min-h-11 items-center gap-2 pl-4 pr-1"
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
        Demo by <strong className="font-semibold text-accent group-hover:text-accent-hover">Zordev</strong>
        <span className="hidden text-fg-muted sm:inline">· see the case study</span>
        <span aria-hidden="true">→</span>
      </a>
      <button type="button" onClick={dismiss} aria-label="Hide the Zordev badge" className="h-11 w-11 text-fg-muted hover:text-fg">
        ×
      </button>
    </div>
  );
}
