"use client";

import { useInViewAnimation } from "@/hooks/useInViewAnimation";
import { ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  type?: "slide-from-left" | "fade-in" | "slide-up";
}

export default function AnimatedSection({
  children,
  type = "slide-from-left",
}: AnimatedSectionProps) {
  const { ref, isInView } = useInViewAnimation();

  return (
    <div
      ref={ref}
      className={`${type} ${isInView ? "visible" : ""}`}
    >
      {children}
    </div>
  );
}
