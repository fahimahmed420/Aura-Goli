import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import NewsletterForm from "@/components/storefront/NewsletterForm";
import TestimonialSlider from "@/components/storefront/TestimonialSlider";
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

  // Shoppable lookbook built from real catalog imagery (deduped, max 6).
  const lookbook = Array.from(
    new Map(
      [...bestsellers, ...newArrivals]
        .filter((p) => p.images?.[0]?.url)
        .map((p) => [p.images[0].url, { src: p.images[0].url, alt: p.name, slug: p.slug }])
    ).values()
  ).slice(0, 6);

  return (
    <div className="bg-canvas">

      {/* ── HERO — WebGL silk, interactive tilt ─────────────────────────── */}
      <Hero3D />

      {/* ── TRUST BAR ────────────────────────────────────────────────────── */}
      <div className="border-y border-line text-fg-subtle bg-canvas">
        <Marquee items={TRUST} />
      </div>

      {/* ── COLLECTIONS ──────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="py-14 md:py-32">
          <div className="max-w-[1440px] mx-auto px-5 md:px-10">
            <SectionHeader eyebrow="Collections" title="Shop by style" link={{ href: "/shop", label: "View all" }} size="xl" />

            {/* Mobile: horizontal scroll */}
            <div className="flex md:hidden overflow-x-auto gap-3 pb-4 scrollbar-none -mx-5 px-5">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/shop?category=${cat.slug}`}
                  className="relative overflow-hidden shrink-0 flex flex-col active:scale-[0.97] transition-transform"
                  style={{ width: "68vw", maxWidth: "260px", minHeight: "300px", borderRadius: "var(--radius-card)" }}>
                  <div className="absolute inset-0 bg-surface-raised" />
                  {cat.imageUrl && <Image src={cat.imageUrl} alt={cat.name} fill sizes="68vw" className="object-cover" />}
                  <div className="absolute inset-x-0 bottom-0 p-5 pt-20"
                    style={{ background: "linear-gradient(to top, var(--canvas) 40%, transparent 100%)" }}>
                    <h3 className="dd-display text-fg text-[1.3rem] mb-3">{cat.name}</h3>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider px-3 py-1.5 rounded-[var(--radius-pill)] bg-accent-tint text-accent border border-accent/25">
                      Shop <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: bento */}
            <div className="hidden md:grid grid-cols-4 gap-3">
              {categories.slice(0, 4).map((cat, i) => (
                <Link key={cat.id} href={`/shop?category=${cat.slug}`}
                  className={`dd-card group relative overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                  style={{ borderRadius: "var(--radius-card)" }}>
                  <div className={`dd-media relative overflow-hidden bg-surface-raised ${i === 0 ? "h-full min-h-[480px]" : "aspect-[3/4]"}`}>
                    {cat.imageUrl && (
                      <Image src={cat.imageUrl} alt={cat.name} fill
                        sizes={i === 0 ? "(max-width: 1280px) 50vw, 640px" : "(max-width: 1280px) 25vw, 320px"}
                        className="object-cover" />
                    )}
                    <div className="absolute inset-0 flex flex-col justify-end p-7"
                      style={{ background: "linear-gradient(to top, var(--canvas) 4%, transparent 55%)" }}>
                      <h3 className={`dd-display text-fg leading-tight ${i === 0 ? "text-[2.2rem]" : "text-[1.4rem]"}`}>
                        {cat.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-3 text-[11px] font-medium uppercase tracking-[0.16em] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 text-fg-muted">
                        Shop now <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BESTSELLERS ──────────────────────────────────────────────────── */}
      {bestsellers.length > 0 && (
        <section className="py-14 md:py-32 bg-surface">
          <div className="max-w-[1440px] mx-auto px-5 md:px-10">
            <SectionHeader eyebrow="Customer favourites" title="Bestsellers" link={{ href: "/shop", label: "See all" }} size="xl" />

            {/* Mobile carousel */}
            <div className="flex md:hidden overflow-x-auto gap-3 pb-3 scrollbar-none -mx-5 px-5">
              {bestsellers.slice(0, 6).map((p) => (
                <div key={p.id} className="shrink-0" style={{ width: "60vw", maxWidth: "220px" }}>
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
        </section>
      )}

      {/* ── NEW ARRIVALS — editorial split ─────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section className="py-14 md:py-32">
          <div className="max-w-[1440px] mx-auto px-5 md:px-10 grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-24 items-center">
            <div>
              <p className="dd-eyebrow text-fg-subtle mb-6">Just dropped</p>
              <h2 className="dd-display text-fg mb-7" style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)" }}>
                New <span style={{ fontStyle: "italic" }}>arrivals</span>
              </h2>
              <p className="text-[15px] leading-relaxed text-fg-muted mb-10 max-w-sm">
                Fresh cuts, refined silhouettes. The newest Aura Goli pieces — before everyone else has them.
              </p>
              <Button href="/shop?sort=newest" variant="primary" className="hidden lg:inline-flex">
                Shop new arrivals <ArrowRight />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:gap-y-12">
              {newArrivals.slice(0, 4).map((p, i) => (
                <div key={p.id} style={{ marginTop: i % 2 === 1 ? "2.5rem" : undefined }} className="hidden md:block">
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
        </section>
      )}

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <TestimonialSlider reviews={latestReviews} />

      {/* ── LOOKBOOK ─────────────────────────────────────────────────────── */}
      {lookbook.length > 0 && (
        <section className="py-14 md:py-28 bg-surface border-y border-line">
          <div className="max-w-[1440px] mx-auto px-5 md:px-10">
            <div className="text-center mb-10 md:mb-14">
              <p className="dd-eyebrow text-fg-subtle mb-3">The lookbook</p>
              <h2 className="dd-display text-fg" style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)" }}>
                Styled by Aura
              </h2>
              <p className="mt-2 text-[13px] text-fg-muted">Tap a piece to shop the look</p>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
              {lookbook.map((img, i) => (
                <Link key={i} href={`/products/${img.slug}`}
                  className="dd-card aspect-square relative overflow-hidden block active:scale-[0.97] transition-transform"
                  style={{ borderRadius: "6px" }}>
                  <div className="dd-media absolute inset-0">
                    <Image src={img.src} alt={img.alt} fill sizes="(max-width: 768px) 33vw, 16vw" className="object-cover" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 active:opacity-100 md:hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "var(--accent-tint)" }}>
                    <span className="material-symbols-outlined text-xl text-accent">shopping_bag</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── WHY US ───────────────────────────────────────────────────────── */}
      <section className="py-14 md:py-24">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {VALUES.map((v) => (
              <div key={v.t} className="flex items-start gap-4 p-6 bg-surface border border-line" style={{ borderRadius: "var(--radius-card)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-surface-raised text-fg-subtle">
                  <span className="material-symbols-outlined text-xl">{v.icon}</span>
                </div>
                <div>
                  <p className="font-medium mb-1 text-fg">{v.t}</p>
                  <p className="text-[13px] leading-relaxed text-fg-muted">{v.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────────────────────────── */}
      <section className="py-16 md:py-32 relative overflow-hidden bg-surface border-t border-line">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 110%, var(--accent-tint) 0%, transparent 70%)" }} />
        <div className="relative max-w-[1440px] mx-auto px-5 md:px-10 text-center">
          <div className="max-w-xl mx-auto">
            <p className="dd-eyebrow text-fg-subtle mb-5">Inner circle</p>
            <h2 className="dd-display text-fg mb-5" style={{ fontSize: "clamp(2rem, 8vw, 4rem)" }}>
              Join the <span style={{ fontStyle: "italic" }}>Aura</span>
            </h2>
            <p className="text-[14px] leading-relaxed text-fg-muted mb-8">
              First access to limited drops, exclusive events, and stories behind each collection. No spam — just the good stuff.
            </p>
            <NewsletterForm />
            <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-fg-subtle opacity-60">
              By subscribing you agree to our Privacy Policy
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
