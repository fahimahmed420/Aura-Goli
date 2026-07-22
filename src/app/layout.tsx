import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import Analytics from "@/components/Analytics";
import ChatWidget from "@/components/ChatWidget";

/*
  Sitewide type. next/font self-hosts + subsets at build time and emits
  size-adjust fallback metrics, so swapping in a fallback face never shifts
  layout — the same zero-CLS property the old hand-managed fonts.css achieved,
  without shipping 8 extra woff2 binaries.

  --font-display / --font-ui are consumed by design-tokens.css, never named
  directly by components.
*/
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://auragoli.com";

export const viewport: Viewport = {
  themeColor: "#0b0b14",
};

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getSettings();
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
    <html
      lang="en"
      className={`h-full antialiased ${instrumentSerif.variable} ${interTight.variable}`}
      data-theme="noir"
    >
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        {/* Only the Material Symbols icon font still loads from Google — display
            and UI type are self-hosted via next/font above. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-fg" style={{ fontFamily: "var(--font-ui)" }}>
        <Analytics />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
