import type { Metadata } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";

export function generateMetadata(): Metadata {
  const { storeName } = getSettings();
  const name = storeName || "Aura Goli";
  return {
    title: { default: `${name} — Premium T-Shirts`, template: `%s | ${name}` },
    description: `${name} — Premium threads crafted for the modern minimalist.`,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Warm the font origins before the render-blocking stylesheets fire */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#faf7f0] text-[#1a1c1c]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
