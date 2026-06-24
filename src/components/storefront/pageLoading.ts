"use client";

/**
 * pageLoading — a tiny shared signal the LoadingScreen curtain uses to know when
 * a page's *content* (not just its route shell) has finished loading.
 *
 * Pages that fetch their main content on the client (e.g. the shop grid, search
 * results) call `usePageContentLoading(isLoading)`. While any such page is
 * loading, `pending > 0`, and the curtain stays up until it drops back to 0.
 * Pages with no client-side content fetch never touch it, so the curtain just
 * lifts after its minimum display time.
 */

import { useEffect } from "react";

type Listener = () => void;

let pending = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export const pageLoading = {
  get pending() {
    return pending;
  },
  begin() {
    pending += 1;
    emit();
  },
  end() {
    pending = Math.max(0, pending - 1);
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/** Hold the loading curtain while `isLoading` is true. */
export function usePageContentLoading(isLoading: boolean) {
  useEffect(() => {
    if (!isLoading) return;
    pageLoading.begin();
    return () => pageLoading.end();
  }, [isLoading]);
}
