import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import Analytics from "@/components/Analytics";
import ChatWidget from "@/components/ChatWidget";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://auragoli.com";

export const viewport: Viewport = {
  themeColor: "#0b0b14",
};

export function generateMetadata(): Metadata {
  const { storeName } = getSettings();
  const name = storeName || "Aura Goli";
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${name} — Premium Clothing`, template: `%s | ${name}` },
    description: `${name} — Premium clothing crafted for the modern minimalist.`,
    icons: {
      icon: [
        { url: "/favicon.ico?v=2", type: "image/x-icon" },
      ],
      apple: "/apple-touch-icon.png?v=2"
    },
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: name, url: SITE_URL },
    appleWebApp: { capable: true, title: name, statusBarStyle: "black-translucent" },
  };
}

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Aura Goli",
  url: SITE_URL,
  logo: `${SITE_URL}/logo-mark.png`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        {/* Playfair Display + Hanken Grotesk are now self-hosted (see globals.css /
            fonts.css) — no render-blocking text-font request. Only the Material
            Symbols icon font is still loaded from Google. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#faf7f0] text-[#1a1c1c]" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
        <Analytics />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
