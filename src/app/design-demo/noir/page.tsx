import Image from "next/image";
import Link from "next/link";
import { getDemoData } from "../demo-data";
import Button, { ArrowRight } from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import ProductCard from "@/components/ui/ProductCard";
import Marquee from "@/components/ui/Marquee";

export const dynamic = "force-dynamic";

/*
  Living style guide for the Noir + Gold system — the direction the whole site
  is now built on. Kept as a reference page (not the homepage itself) so the
  vocabulary — accent budget, type pairing, motion — stays inspectable in one
  place as the sitewide rollout proceeds.

  Accent (gold) appears at most five times per viewport and only ever on
  something clickable. Everything else carries on the three-step dark surface
  ramp and the ivory text ramp — that ramp is where depth comes from instead.
*/

const TRUST = [
  "Free shipping above ৳2,000",
  "30-day returns",
  "GOTS-certified cotton",
  "Made in Bangladesh",
  "Lifetime quality promise",
];

const VALUES = [
  { n: "01", t: "Lifetime quality", b: "Stitching, print and fabric guaranteed. If it fails, we replace it." },
  { n: "02", t: "Ethically sourced", b: "Supima cotton from GOTS-certified mills. Wages audited annually." },
  { n: "03", t: "Free delivery", b: "Above ৳2,000 nationwide. Same-day across Dhaka." },
];

export default async function NoirDemo() {
  const { categories, bestsellers, newArrivals, reviews } = await getDemoData();
  const hero = bestsellers[0]?.images[0]?.url ?? "/Premium.png";

  return (
    <div className="bg-canvas text-fg min-h-screen" style={{ fontFamily: "var(--font-ui)" }}>
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-xl border-b border-line">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10 h-20 flex items-center gap-10">
          <Link href="/design-demo/noir" className="dd-display text-[26px] text-fg shrink-0">
            Aura Goli
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-fg-muted">
            {["Shop all", ...categories.slice(0, 3).map((c) => c.name)].map((l) => (
              <Link key={l} href="#" className="dd-link hover:text-fg transition-colors">
                {l}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-7 text-[13px] text-fg-muted">
            <Link href="#" className="dd-link hover:text-fg transition-colors hidden sm:inline">Search</Link>
            <Link href="#" className="dd-link hover:text-fg transition-colors hidden sm:inline">Account</Link>
            <Link href="#" className="dd-link hover:text-fg transition-colors">
              Bag <span className="text-fg-subtle">(2)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 78% 45%, var(--accent-tint) 0%, transparent 68%)" }}
        />
        <div className="relative max-w-[1440px] mx-auto px-5 md:px-10 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-20 items-center py-20 lg:py-28">
          <div className="dd-rise">
            <p className="dd-eyebrow text-fg-subtle mb-8">Autumn collection · 2026</p>
            <h1
              className="dd-display text-fg mb-8"
              style={{ fontSize: "clamp(3.2rem, 8.5vw, 7.5rem)" }}
            >
              Weight you
              <br />
              can feel,
              <br />
              <span style={{ fontStyle: "italic" }}>cut you can keep.</span>
            </h1>
            <p className="text-[17px] leading-relaxed text-fg-muted max-w-md mb-12">
              Heavyweight Supima cotton, cut in Dhaka, finished to hold its shape past
              the hundredth wash. Built for people who buy once.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button href="#" variant="primary">
                Shop the collection <ArrowRight />
              </Button>
              <Button href="#" variant="secondary">
                Our fabric
              </Button>
            </div>

            <div className="flex items-center gap-10 mt-16 pt-10 border-t border-line">
              {[
                ["12,400+", "Orders delivered"],
                ["4.9", "Average rating"],
                ["2 days", "Nationwide delivery"],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="dd-display text-fg text-[28px] mb-1.5">{v}</p>
                  <p className="text-[12px] text-fg-subtle">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="dd-rise" style={{ animationDelay: "0.15s" }}>
            <div
              className="relative overflow-hidden"
              style={{ aspectRatio: "4 / 5", borderRadius: "var(--radius-card)" }}
            >
              <Image src={hero} alt="" fill priority sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust ────────────────────────────────────────────────────────── */}
      <div className="border-y border-line text-fg-subtle">
        <Marquee items={TRUST} />
      </div>

      {/* ── Collections ──────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="py-24 md:py-36">
          <div className="max-w-[1440px] mx-auto px-5 md:px-10">
            <SectionHeader
              eyebrow="Collections"
              title="Shop by style"
              link={{ href: "#", label: "All collections" }}
              size="xl"
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.slice(0, 4).map((cat, i) => (
                <Link
                  key={cat.id}
                  href="#"
                  className="dd-card group relative overflow-hidden"
                  style={{
                    borderRadius: "var(--radius-card)",
                    aspectRatio: i % 3 === 0 ? "3 / 4" : "3 / 4",
                    marginTop: i % 2 === 1 ? "2.5rem" : undefined,
                  }}
                >
                  <div className="dd-media absolute inset-0 bg-surface-raised">
                    {cat.imageUrl && (
                      <Image src={cat.imageUrl} alt={cat.name} fill sizes="(max-width: 1024px) 50vw, 340px" className="object-cover" />
                    )}
                  </div>
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, var(--canvas) 4%, transparent 62%)" }}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="dd-display text-fg text-[26px] mb-1">{cat.name}</h3>
                    <span className="flex items-center gap-2 text-[12px] text-fg-muted opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400">
                      Shop <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bestsellers ──────────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10">
          <SectionHeader
            eyebrow="Customer favourites"
            title="Bestsellers"
            link={{ href: "#", label: "View all" }}
            size="xl"
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-14">
            {bestsellers.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── New arrivals — editorial split ───────────────────────────────── */}
      <section className="py-24 md:py-36">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10 grid lg:grid-cols-[0.85fr_1.15fr] gap-14 lg:gap-24 items-center">
          <div>
            <p className="dd-eyebrow text-fg-subtle mb-6">Just dropped</p>
            <h2 className="dd-display text-fg mb-7" style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>
              New <span style={{ fontStyle: "italic" }}>arrivals</span>
            </h2>
            <p className="text-[16px] leading-relaxed text-fg-muted mb-10 max-w-sm">
              Fresh cuts and refined silhouettes. The newest pieces, before the
              rest of the country has them.
            </p>
            <Button href="#" variant="secondary">
              Shop new in <ArrowRight />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-12">
            {newArrivals.slice(0, 4).map((p, i) => (
              <div key={p.id} style={{ marginTop: i % 2 === 1 ? "3rem" : undefined }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-surface border-y border-line">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10 grid md:grid-cols-3 gap-12 md:gap-8">
          {VALUES.map((v) => (
            <div key={v.n}>
              <p className="dd-display text-fg-subtle text-[42px] mb-5">{v.n}</p>
              <h3 className="text-[17px] font-medium text-fg mb-3">{v.t}</h3>
              <p className="text-[15px] leading-relaxed text-fg-muted max-w-xs">{v.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <section className="py-24 md:py-36">
          <div className="max-w-[1440px] mx-auto px-5 md:px-10">
            <SectionHeader eyebrow="In their words" title="Worn and reviewed" align="center" size="xl" />
            <div className="grid md:grid-cols-3 gap-4">
              {reviews.slice(0, 3).map((r) => (
                <figure
                  key={r.id}
                  className="p-9 bg-surface border border-line"
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <div className="flex gap-1 mb-6 text-fg-subtle" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} viewBox="0 0 20 20" className="w-3.5 h-3.5" aria-hidden="true"
                        fill={i < r.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2">
                        <path d="m10 2 2.4 5.1 5.6.8-4 4 .9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-4 5.6-.8z" />
                      </svg>
                    ))}
                  </div>
                  {r.title && <p className="dd-display text-fg text-[24px] mb-4">{r.title}</p>}
                  <blockquote className="text-[15px] leading-relaxed text-fg-muted mb-8">
                    {r.body}
                  </blockquote>
                  <figcaption className="text-[12px] text-fg-subtle border-t border-line pt-5">
                    {r.authorName}
                    {r.productName && <> · {r.productName}</>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Newsletter ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface border-t border-line">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 55% 70% at 50% 118%, var(--accent-tint) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-[1440px] mx-auto px-5 md:px-10 py-28 md:py-40 text-center">
          <p className="dd-eyebrow text-fg-subtle mb-7">Inner circle</p>
          <h2 className="dd-display text-fg mb-7 mx-auto" style={{ fontSize: "clamp(2.8rem, 8vw, 6rem)" }}>
            Join the <span style={{ fontStyle: "italic" }}>Aura</span>
          </h2>
          <p className="text-[16px] leading-relaxed text-fg-muted max-w-lg mx-auto mb-12">
            First access to limited drops and the stories behind each collection.
            No spam, roughly twice a month.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 h-12 px-6 bg-canvas border border-line text-fg placeholder:text-fg-subtle text-[15px] outline-none focus:border-line-strong transition-colors"
              style={{ borderRadius: "var(--radius-pill)" }}
            />
            <Button href="#" variant="primary">Subscribe</Button>
          </form>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10 py-20">
          <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-20">
            <div>
              <p className="dd-display text-fg text-[30px] mb-5">Aura Goli</p>
              <p className="text-[15px] leading-relaxed text-fg-muted max-w-xs">
                Premium clothing for people who would rather own four good things
                than forty average ones.
              </p>
            </div>
            {[
              { t: "Shop", l: ["All products", "New arrivals", "Bestsellers", "Sale"] },
              { t: "Help", l: ["FAQ", "Returns", "Delivery", "Contact"] },
              { t: "Company", l: ["About", "Privacy", "Terms", "Careers"] },
            ].map((col) => (
              <div key={col.t}>
                <p className="dd-eyebrow text-fg-subtle mb-6">{col.t}</p>
                <ul className="space-y-3.5">
                  {col.l.map((l) => (
                    <li key={l}>
                      <Link href="#" className="dd-link text-[15px] text-fg-muted hover:text-fg transition-colors">
                        {l}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pt-10 border-t border-line text-[13px] text-fg-subtle">
            <p>© 2026 Aura Goli. All rights reserved.</p>
            <p>Dhaka, Bangladesh</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
