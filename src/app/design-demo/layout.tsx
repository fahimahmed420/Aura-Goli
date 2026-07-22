import type { Metadata } from "next";

/*
  Fonts now load once in the root layout (src/app/layout.tsx) and are
  available as --font-instrument-serif / --font-inter-tight everywhere,
  including here. This route is the living style guide for the noir tokens —
  kept out of search results.
*/
export const metadata: Metadata = {
  title: "Design demo",
  robots: { index: false, follow: false },
};

export default function DesignDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
