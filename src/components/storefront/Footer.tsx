import Link from "next/link";
import Image from "next/image";
import { getSettings } from "@/lib/settings";

export default async function Footer() {
  const year = new Date().getFullYear();
  const { storeName, email, phone, address, instagramUrl, facebookUrl, tiktokUrl, youtubeUrl } = await getSettings();

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
    <footer style={{ background: "#0b0b14", color: "#faf7f0" }}>
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 pt-14 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-8">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-3 font-['Playfair_Display'] text-2xl font-bold tracking-tight"
              style={{ color: "#faf7f0" }}>
              <Image src="/logo-mark.png" alt={displayName} width={29} height={32} className="h-8 w-auto" />
              <span>
                {displayName.includes(" ") ? (
                  <>
                    {displayName.split(" ")[0]}
                    <span style={{ color: "#c9a84c" }}> {displayName.split(" ").slice(1).join(" ")}</span>
                  </>
                ) : (
                  <span style={{ color: "#faf7f0" }}>{displayName}</span>
                )}
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(250,247,240,0.4)" }}>
              Premium threads crafted with intention. Every piece is designed to endure — in quality, in style, in feeling.
            </p>

            {/* Contact info from settings */}
            <div className="space-y-2 mb-5">
              {email && (
                <a href={`mailto:${email}`}
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: "rgba(250,247,240,0.5)" }}>
                  <span className="material-symbols-outlined text-base" style={{ color: "#c9a84c" }}>mail</span>
                  {email}
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`}
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: "rgba(250,247,240,0.5)" }}>
                  <span className="material-symbols-outlined text-base" style={{ color: "#c9a84c" }}>phone</span>
                  {phone}
                </a>
              )}
              {address && (
                <p className="flex items-center gap-2 text-sm" style={{ color: "rgba(250,247,240,0.5)" }}>
                  <span className="material-symbols-outlined text-base" style={{ color: "#c9a84c" }}>location_on</span>
                  {address}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {[
                { label: "Instagram", href: instagramUrl, svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
                { label: "Facebook", href: facebookUrl, svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                { label: "TikTok", href: tiktokUrl, svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
                { label: "YouTube", href: youtubeUrl, svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
              ].filter((s) => s.href).map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{ background: "rgba(250,247,240,0.08)", border: "1px solid rgba(250,247,240,0.12)", color: "rgba(250,247,240,0.7)" }}>
                  {s.svg}
                </a>
              ))}
            </div>
          </div>

          {/* Nav sections */}
          {sections.map((sec) => (
            <div key={sec.title}>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: "#c9a84c" }}>
                {sec.title}
              </p>
              <ul className="space-y-2.5">
                {sec.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm transition-colors duration-200"
                      style={{ color: "rgba(250,247,240,0.45)" }}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-10 pt-8 flex flex-wrap items-center gap-3"
          style={{ borderTop: "1px solid rgba(250,247,240,0.07)" }}>
          {["SSL Secured", "Cash on Delivery", "Easy Returns", "Authentic Products"].map((b) => (
            <span key={b}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full"
              style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c" }}>
              <span className="material-symbols-outlined text-xs">verified</span>
              {b}
            </span>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2"
          style={{ borderTop: "1px solid rgba(250,247,240,0.06)" }}>
          <p className="text-[11px]" style={{ color: "rgba(250,247,240,0.3)" }}>
            © {year} {displayName}. All rights reserved.
          </p>
          <p className="text-[11px]" style={{ color: "rgba(250,247,240,0.2)" }}>
            Crafted with care · Bangladesh
          </p>
        </div>
      </div>

    </footer>
  );
}
