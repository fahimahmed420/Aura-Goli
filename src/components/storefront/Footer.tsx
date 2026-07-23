import Link from "next/link";
import Image from "next/image";
import { getSettings } from "@/lib/settings";

export default async function Footer() {
  const year = new Date().getFullYear();
  const { storeName, email, phone, address, facebookUrl } = await getSettings();

  // Portfolio owner's personal profile links — not admin-configurable settings.
  const linkedinUrl = "https://www.linkedin.com/in/REPLACE_ME";
  const githubUrl = "https://github.com/REPLACE_ME";

  const displayName = storeName || "Aura Goli";

  const sections = [
    {
      title: "Shop",
      links: [
        { href: "/shop", label: "All Products" },
        { href: "/shop?sort=newest", label: "New Arrivals" },
        { href: "/shop?sort=popular", label: "Best Sellers" },
        { href: "/shop?sort=price_asc", label: "Sale & Deals" },
      ],
    },
    {
      title: "Help",
      links: [
        { href: "/faq", label: "FAQ" },
        { href: "/returns", label: "Returns & Exchange" },
        { href: "/contact", label: "Contact Us" },
        { href: "/about", label: `About ${displayName}` },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Service" },
      ],
    },
  ];

  return (
    <footer className="bg-canvas text-fg border-t border-line">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 pt-14 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-8">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="dd-display flex items-center gap-2.5 mb-3 text-2xl text-fg">
              <Image src="/logo-mark.png" alt={displayName} width={29} height={32} className="h-8 w-auto" />
              <span>
                {displayName.includes(" ") ? (
                  <>
                    {displayName.split(" ")[0]}
                    <span className="text-accent"> {displayName.split(" ").slice(1).join(" ")}</span>
                  </>
                ) : (
                  <span className="text-fg">{displayName}</span>
                )}
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-5 text-fg-muted">
              Premium threads crafted with intention. Every piece is designed to endure — in quality, in style, in feeling.
            </p>

            {/* Contact info from settings */}
            <div className="space-y-2 mb-5">
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors">
                  <span className="material-symbols-outlined text-base text-fg-subtle">mail</span>
                  {email}
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors">
                  <span className="material-symbols-outlined text-base text-fg-subtle">phone</span>
                  {phone}
                </a>
              )}
              {address && (
                <p className="flex items-center gap-2 text-sm text-fg-muted">
                  <span className="material-symbols-outlined text-base text-fg-subtle">location_on</span>
                  {address}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {[
                { label: "Facebook", href: facebookUrl, svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                { label: "LinkedIn", href: linkedinUrl, svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                { label: "GitHub", href: githubUrl, svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.089-.744.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.625-5.479 5.921.43.372.823 1.102.823 2.222 0 1.604-.014 2.896-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg> },
              ].filter((s) => s.href).map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="dd-link w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 bg-surface border border-line text-fg-muted hover:text-fg">
                  {s.svg}
                </a>
              ))}
            </div>
          </div>

          {/* Nav sections */}
          {sections.map((sec) => (
            <div key={sec.title}>
              <p className="dd-eyebrow text-fg-subtle mb-4">{sec.title}</p>
              <ul className="space-y-2.5">
                {sec.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="dd-link text-sm text-fg-muted hover:text-fg transition-colors duration-200">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust badges — neutral, not gold: these are informational, not a CTA */}
        <div className="mt-10 pt-8 flex flex-wrap items-center gap-3 border-t border-line">
          {["Cash on Delivery", "Easy Returns", "Authentic Products"].map((b) => (
            <span key={b}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-[var(--radius-pill)] bg-surface border border-line text-fg-subtle">
              <span className="material-symbols-outlined text-xs">verified</span>
              {b}
            </span>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-line">
          <p className="text-[11px] text-fg-subtle">
            © {year} {displayName}. All rights reserved.
          </p>
          <p className="text-[11px] text-fg-subtle opacity-70">
            Crafted with care · Bangladesh
          </p>
        </div>
      </div>

    </footer>
  );
}
