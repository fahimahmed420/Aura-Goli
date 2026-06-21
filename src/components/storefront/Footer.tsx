import Link from "next/link";
import { getSettings } from "@/lib/settings";

export default function Footer() {
  const year = new Date().getFullYear();
  const { storeName, email, phone, address, instagramUrl, facebookUrl, tiktokUrl } = getSettings();

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
            <Link href="/" className="font-['Playfair_Display'] text-2xl font-bold tracking-tight block mb-3"
              style={{ color: "#faf7f0" }}>
              {displayName.includes(" ") ? (
                <>
                  {displayName.split(" ")[0]}
                  <span style={{ color: "#c9a84c" }}> {displayName.split(" ").slice(1).join(" ")}</span>
                </>
              ) : (
                <span style={{ color: "#faf7f0" }}>{displayName}</span>
              )}
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

            <div className="flex items-center gap-3">
              {[
                { label: "Instagram", icon: "photo_camera", href: instagramUrl },
                { label: "Facebook", icon: "groups", href: facebookUrl },
                { label: "TikTok", icon: "play_circle", href: tiktokUrl },
              ].filter((s) => s.href).map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:opacity-80"
                  style={{ background: "rgba(250,247,240,0.06)", border: "1px solid rgba(250,247,240,0.1)", color: "rgba(250,247,240,0.5)" }}>
                  <span className="material-symbols-outlined text-base">{s.icon}</span>
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

      <div className="md:hidden h-16" />
    </footer>
  );
}
