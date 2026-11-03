"use client";

import { useInViewAnimation } from "@/hooks/useInViewAnimation";
import { ReactNode, useSyncExternalStore } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  type?: "slide-from-left" | "fade-in" | "slide-up";
}

// ?shots=1 (screenshot mode) shows everything at once, no reveal.
const noop = () => () => {};
const shotsMode = () => new URLSearchParams(window.location.search).has("shots");

export default function AnimatedSection({
  children,
  type = "slide-from-left",
}: AnimatedSectionProps) {
  const { ref, isInView } = useInViewAnimation();
  const forced = useSyncExternalStore(noop, shotsMode, () => false);

  return (
    <div
      ref={ref}
      className={`${type} ${isInView || forced ? "visible" : ""}`}
    >
      {children}
    </div>
  );
}
