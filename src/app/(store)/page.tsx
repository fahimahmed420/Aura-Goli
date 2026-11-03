import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import NewsletterForm from "@/components/storefront/NewsletterForm";
import TestimonialSlider from "@/components/storefront/TestimonialSlider";
import AnimatedSection from "@/components/storefront/AnimatedSection";
import Hero3D from "@/components/storefront/Hero3D";
import ProductCard, { type ProductCardData } from "@/components/ui/ProductCard";
import Marquee from "@/components/ui/Marquee";
import SectionHeader from "@/components/ui/SectionHeader";
import Button, { ArrowRight } from "@/components/ui/Button";

// ISR: regenerate the homepage at most every 5 minutes instead of querying
// Postgres on every request. Admin product/category edits call revalidatePath("/").
export const revalidate = 300;

const homeCardSelect = {
  id: true, name: true, slug: true, price: true, compareAtPrice: true,
  createdAt: true, salesCount: true,
  category: { select: { name: true, slug: true } },
  images: { select: { url: true, altText: true }, orderBy: { sortOrder: "asc" as const }, take: 2 },
  variants: { select: { color: true, size: true, stockQuantity: true } },
  _count: { select: { reviews: true } },
};

async function getHomeData() {
  const [categories, bestsellers, newArrivals, latestReviews] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, imageUrl: true },
    }),
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { salesCount: "desc" },
      take: 8,
      select: homeCardSelect,
    }),
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: homeCardSelect,
    }),
    prisma.review.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
  ]);
  // Prisma returns Decimal for price fields — serialize to plain numbers, and
  // normalize into the shape components/ui/ProductCard consumes.
  const toCard = (p: (typeof bestsellers)[number], isNew: boolean): ProductCardData => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : undefined,
    images: p.images,
    categoryName: p.category?.name,
    reviewCount: p._count.reviews,
    stock: p.variants.reduce((s, v) => s + v.stockQuantity, 0),
    isNew,
  });
  return {
    categories,
    bestsellers: bestsellers.map((p) => toCard(p, false)),
    newArrivals: newArrivals.map((p) => toCard(p, true)),
    latestReviews: latestReviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };
}

const TRUST = [
  "Free shipping above ৳2,000",
  "30-day returns",
  "Ethically sourced cotton",
  "Lifetime quality promise",
  "Made in Bangladesh",
  "4.9★ customer rating",
];

const VALUES = [
  { icon: "verified", t: "Lifetime quality", b: "Stitching, printing, and fabric quality guaranteed. If it fails, we replace it — no questions." },
  { icon: "eco", t: "Ethically sourced", b: "100% Supima cotton from GOTS-certified mills. Ethical wages, audited annually." },
  { icon: "local_shipping", t: "Free delivery", b: "Free shipping on all orders above ৳2,000. Same-day delivery across Dhaka." },
];

export default async function HomePage() {
  const { categories, bestsellers, newArrivals, latestReviews } = await getHomeData();

  // The hero's floating card shows the top bestseller with a photo.
  const heroPick = bestsellers.find((p) => p.images[0]?.url) ?? newArrivals.find((p) => p.images[0]?.url);
  const featured = heroPick
    ? { name: heroPick.name, slug: heroPick.slug, price: heroPick.price, image: heroPick.images[0]?.url, category: heroPick.categoryName }
    : undefined;

  // Shoppable lookbook built from real catalog imagery (deduped, max 8).
  const lookbook = Array.from(
    new Map(
      [...bestsellers, ...newArrivals]
        .flatMap((p) => p.images.filter((i) => i.url).map((i) => [i.url, { src: i.url, alt: p.name, slug: p.slug, price: p.price }] as const))
    ).values()
  ).slice(0, 8);

  return (
    <div className="bg-canvas">

      {/* ── HERO — gradient mesh + WebGL silk, floating product card ─────── */}
      <Hero3D featured={featured} />

      {/* ── TRUST BAR ────────────────────────────────────────────────────── */}
      <div className="border-y border-line text-fg-subtle bg-canvas">
        <Marquee items={TRUST} />
      </div>

      {/* ── COLLECTIONS ──────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="relative py-16 md:py-32 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 ag-glow ag-glow--right" />
          <AnimatedSection type="slide-up">
            <div className="relative max-w-[1440px] mx-auto px-5 md:px-10">
              <SectionHeader eyebrow="Collections" title={<>Shop by <span style={{ fontStyle: "italic" }}>style</span></>} link={{ href: "/shop", label: "View all" }} size="xl" />
            </div>

            {/* Mobile: horizontal snap strip */}
            <div className="flex md:hidden overflow-x-auto gap-3 pb-4 px-5 scrollbar-none snap-x snap-mandatory">
              {categories.map((cat, i) => (
                <Link key={cat.id} href={`/shop?category=${cat.slug}`}
                  className="relative overflow-hidden shrink-0 flex flex-col snap-start active:scale-[0.97] transition-transform"
                  style={{ width: "72vw", maxWidth: "280px", minHeight: "340px", borderRadius: "var(--radius-card)" }}>
                  <div className="absolute inset-0 bg-surface-raised" />
                  {cat.imageUrl && <Image src={cat.imageUrl} alt={cat.name} fill sizes="72vw" className="object-cover" />}
                  <span className="absolute top-4 left-4 dd-eyebrow text-fg/70">0{i + 1}</span>
                  <div className="absolute inset-x-0 bottom-0 p-5 pt-24"
                    style={{ background: "linear-gradient(to top, var(--canvas) 30%, transparent 100%)" }}>
                    <h3 className="dd-display text-fg text-[1.9rem] mb-3">{cat.name}</h3>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider px-3 py-1.5 rounded-[var(--radius-pill)] bg-accent-tint text-accent border border-accent/25">
                      Shop <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: bento with editorial type over the photos */}
            <div className="relative max-w-[1440px] mx-auto px-5 md:px-10 hidden md:grid grid-cols-4 gap-3">
              {categories.slice(0, 4).map((cat, i) => (
                <Link key={cat.id} href={`/shop?category=${cat.slug}`}
                  className={`dd-card group relative overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : i === 3 ? "col-span-2" : ""}`}
                  style={{ borderRadius: "var(--radius-card)" }}>
                  <div className={`dd-media relative overflow-hidden bg-surface-raised ${i === 0 ? "h-full min-h-[560px]" : i === 3 ? "aspect-[3/2]" : "aspect-[3/4]"}`}>
                    {cat.imageUrl && (
                      <Image src={cat.imageUrl} alt={cat.name} fill
                        sizes={i === 0 || i === 3 ? "(max-width: 1280px) 50vw, 640px" : "(max-width: 1280px) 25vw, 320px"}
                        className="object-cover" />
                    )}
                    <span className="absolute top-6 left-6 dd-eyebrow text-fg/60">0{i + 1}</span>
                    <div className="absolute inset-0 flex flex-col justify-end p-7"
                      style={{ background: "linear-gradient(to top, var(--canvas) 4%, transparent 55%)" }}>
                      <h3 className={`dd-display text-fg leading-[0.95] ${i === 0 ? "text-[3.4rem]" : "text-[1.8rem]"}`}>
                        {cat.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-3 text-[11px] font-medium uppercase tracking-[0.16em] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 text-accent">
                        Shop now <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </AnimatedSection>
        </section>
      )}

      {/* ── BESTSELLERS ──────────────────────────────────────────────────── */}
      {bestsellers.length > 0 && (
        <section className="relative py-16 md:py-32 bg-surface">
          <div aria-hidden="true" className="absolute inset-0 ag-grain" />
          <AnimatedSection type="slide-up">
            <div className="relative max-w-[1440px] mx-auto px-5 md:px-10">
              <SectionHeader eyebrow="Customer favourites" title="Bestsellers" link={{ href: "/shop?sort=popular", label: "See all" }} size="xl" />

              {/* Mobile carousel */}
              <div className="flex md:hidden overflow-x-auto gap-3 pb-3 scrollbar-none -mx-5 px-5 snap-x">
                {bestsellers.slice(0, 6).map((p) => (
                  <div key={p.id} className="shrink-0 snap-start" style={{ width: "62vw", maxWidth: "230px" }}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>

              {/* Desktop grid */}
              <div className="hidden md:grid grid-cols-4 gap-x-4 gap-y-14">
                {bestsellers.slice(0, 4).map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i === 0} />
                ))}
              </div>

              <div className="text-center mt-10 md:mt-16">
                <Button href="/shop" variant="secondary">
                  View all products <ArrowRight />
                </Button>
              </div>
            </div>
          </AnimatedSection>
        </section>
      )}

      {/* ── NEW ARRIVALS — editorial split ─────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section className="relative py-16 md:py-32 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 ag-glow ag-glow--left" />
          <AnimatedSection type="slide-up">
            <div className="relative max-w-[1440px] mx-auto px-5 md:px-10 grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-24 items-center">
              <div className="lg:sticky lg:top-32">
                <p className="dd-eyebrow text-fg-subtle mb-6">Just dropped</p>
                <h2 className="dd-display text-fg mb-7" style={{ fontSize: "clamp(2.6rem, 7vw, 5.5rem)" }}>
                  New <span style={{ fontStyle: "italic" }}>arrivals</span>
                </h2>
                <p className="text-[15px] md:text-[16px] leading-relaxed text-fg-muted mb-10 max-w-sm">
                  Fresh cuts, refined silhouettes. The newest Aura Goli pieces — before everyone else has them.
                </p>
                <Button href="/shop?sort=newest" variant="primary" className="hidden lg:inline-flex">
                  Shop new arrivals <ArrowRight />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:gap-y-12">
                {newArrivals.slice(0, 4).map((p, i) => (
                  <div key={p.id} style={{ marginTop: i % 2 === 1 ? "3.5rem" : undefined }} className="hidden md:block">
                    <ProductCard product={p} />
                  </div>
                ))}
                {newArrivals.slice(0, 4).map((p) => (
                  <div key={`m-${p.id}`} className="md:hidden">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>

              <Button href="/shop?sort=newest" variant="primary" className="lg:hidden w-full">
                Shop new arrivals <ArrowRight />
              </Button>
            </div>
          </AnimatedSection>
        </section>
      )}

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <TestimonialSlider reviews={latestReviews} />

      {/* ── LOOKBOOK — horizontal snap strip ──────────────────────────────── */}
      {lookbook.length > 0 && (
        <section className="relative py-16 md:py-28 bg-surface border-y border-line overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 ag-grain" />
          <AnimatedSection type="slide-up">
            <div className="relative max-w-[1440px] mx-auto px-5 md:px-10 flex items-end justify-between gap-6 mb-10 md:mb-14">
              <div>
                <p className="dd-eyebrow text-fg-subtle mb-3">The lookbook</p>
                <h2 className="dd-display text-fg" style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)" }}>
                  Styled by <span style={{ fontStyle: "italic" }}>Aura</span>
                </h2>
              </div>
              <p className="hidden sm:block text-[13px] text-fg-muted shrink-0">Scroll sideways · tap a piece to shop it</p>
            </div>

            <div className="relative flex overflow-x-auto gap-3 md:gap-4 px-5 md:px-10 pb-4 scrollbar-none snap-x snap-mandatory ag-fade-x">
              {lookbook.map((img, i) => (
                <Link key={i} href={`/products/${img.slug}`}
                  className={`dd-card group relative overflow-hidden block shrink-0 snap-start active:scale-[0.98] transition-transform ${i % 3 === 1 ? "md:mt-10" : ""}`}
                  style={{ width: "min(64vw, 300px)", aspectRatio: "3 / 4", borderRadius: "var(--radius-card)" }}>
                  <div className="dd-media absolute inset-0">
                    <Image src={img.src} alt={img.alt} fill sizes="(max-width: 768px) 64vw, 300px" className="object-cover" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 pt-16 flex items-end justify-between gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: "linear-gradient(to top, rgba(11,11,20,0.9), transparent)" }}>
                    <span className="text-[13px] font-medium text-fg truncate">{img.alt}</span>
                    <span className="dd-display text-accent shrink-0">৳{img.price.toLocaleString("en-BD")}</span>
                  </div>
                  <span className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-canvas/70 text-fg backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-lg">shopping_bag</span>
                  </span>
                </Link>
              ))}
            </div>
          </AnimatedSection>
        </section>
      )}

      {/* ── WHY US ───────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-28">
        <AnimatedSection type="slide-up">
          <div className="max-w-[1440px] mx-auto px-5 md:px-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {VALUES.map((v, i) => (
                <div key={v.t} className="relative overflow-hidden p-7 bg-surface border border-line" style={{ borderRadius: "var(--radius-card)" }}>
                  <span className="absolute top-5 right-6 dd-eyebrow text-fg-subtle/60">0{i + 1}</span>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mb-6 bg-accent-tint text-accent border border-accent/20">
                    <span className="material-symbols-outlined text-xl">{v.icon}</span>
                  </div>
                  <p className="dd-display text-[1.5rem] mb-2 text-fg">{v.t}</p>
                  <p className="text-[13.5px] leading-relaxed text-fg-muted">{v.b}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-36 overflow-hidden bg-surface">
        <div aria-hidden="true" className="ag-hairline absolute top-0 inset-x-0" />
        <div aria-hidden="true" className="absolute inset-0 ag-grain" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 55% at 50% 115%, rgba(201,168,76,0.18) 0%, transparent 70%)" }} />
        <AnimatedSection type="slide-up">
          <div className="relative max-w-[1440px] mx-auto px-5 md:px-10 text-center">
            <div className="max-w-2xl mx-auto">
              <p className="dd-eyebrow text-fg-subtle mb-5">Inner circle</p>
              <h2 className="dd-display text-fg mb-5" style={{ fontSize: "clamp(2.6rem, 9vw, 5.5rem)" }}>
                Join the <span className="text-accent" style={{ fontStyle: "italic" }}>Aura</span>
              </h2>
              <p className="text-[15px] leading-relaxed text-fg-muted mb-9 max-w-md mx-auto">
                First access to limited drops, exclusive events, and stories behind each collection. No spam — just the good stuff.
              </p>
              <NewsletterForm />
              <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-fg-subtle opacity-60">
                By subscribing you agree to our Privacy Policy
              </p>
            </div>
          </div>
        </AnimatedSection>
      </section>

    </div>
  );
}
