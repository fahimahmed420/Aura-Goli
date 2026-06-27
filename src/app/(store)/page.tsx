import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import NewsletterForm from "@/components/storefront/NewsletterForm";
import TestimonialSlider from "@/components/storefront/TestimonialSlider";
import Hero3D from "@/components/storefront/Hero3D";

// ISR: regenerate the homepage at most every 5 minutes instead of querying
// Postgres on every request. Admin product/category edits call revalidatePath("/").
export const revalidate = 300;

const homeCardSelect = {
  id: true, name: true, slug: true, price: true, compareAtPrice: true,
  createdAt: true, salesCount: true,
  category: { select: { name: true, slug: true } },
  images: { select: { url: true, altText: true }, orderBy: { sortOrder: "asc" as const }, take: 1 },
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
  // Prisma returns Decimal for price fields — serialize to plain numbers for the cards.
  const toCard = (p: (typeof bestsellers)[number]) => ({
    ...p,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : undefined,
  });
  return {
    categories,
    bestsellers: bestsellers.map(toCard),
    newArrivals: newArrivals.map(toCard),
    latestReviews: latestReviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };
}

export default async function HomePage() {
  const { categories, bestsellers, newArrivals, latestReviews } = await getHomeData();

  // Shoppable lookbook built from real catalog imagery (deduped, max 6) — replaces
  // the previous hardcoded placeholder photos.
  const lookbook = Array.from(
    new Map(
      [...bestsellers, ...newArrivals]
        .filter((p) => p.images?.[0]?.url)
        .map((p) => [p.images[0].url, { src: p.images[0].url, alt: p.name, slug: p.slug }])
    ).values()
  ).slice(0, 6);

  return (
    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* ── HERO — 3D interactive ────────────────────────────────────── */}
      <Hero3D />

      {/* ── TRUST BAR — scrolling marquee on mobile ───────────────────── */}
      <section className="overflow-hidden" style={{ background: "#c9a84c" }}>
        <div className="flex animate-[marquee_18s_linear_infinite] whitespace-nowrap py-3.5">
          {[
            "Free Shipping above ৳2,000",
            "30-Day Returns",
            "Ethically Sourced Cotton",
            "Lifetime Quality Promise",
            "Made in Bangladesh",
            "4.9★ Customer Rating",
          ].flatMap((t, i) => [
            <span key={`a${i}`} className="text-[12px] font-bold uppercase tracking-[0.2em] px-6 shrink-0"
              style={{ color: "#0b0b14" }}>{t}</span>,
            <span key={`d${i}`} className="text-[11px] font-bold px-2 opacity-30 shrink-0"
              style={{ color: "#0b0b14" }}>·</span>,
          ])}
          {/* Duplicate for seamless loop */}
          {[
            "Free Shipping above ৳2,000",
            "30-Day Returns",
            "Ethically Sourced Cotton",
            "Lifetime Quality Promise",
            "Made in Bangladesh",
            "4.9★ Customer Rating",
          ].flatMap((t, i) => [
            <span key={`b${i}`} className="text-[12px] font-bold uppercase tracking-[0.2em] px-6 shrink-0"
              style={{ color: "#0b0b14" }}>{t}</span>,
            <span key={`e${i}`} className="text-[11px] font-bold px-2 opacity-30 shrink-0"
              style={{ color: "#0b0b14" }}>·</span>,
          ])}
        </div>
      </section>

      {/* ── CATEGORIES — horizontal scroll on mobile ──────────────────── */}
      {categories.length > 0 && (
        <section style={{ background: "#12103a" }} className="py-14 md:py-24">
          <div className="max-w-[1280px] mx-auto">
            {/* Header */}
            <div className="flex items-end justify-between mb-8 px-5 md:px-14">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: "#c9a84c" }}>
                  Collections
                </p>
                <h2 className="font-['Playfair_Display'] font-bold leading-tight"
                  style={{ fontSize: "clamp(1.8rem, 6vw, 3.8rem)", color: "#faf7f0" }}>
                  Shop by Style
                </h2>
              </div>
              <Link href="/shop"
                className="text-[11px] font-bold uppercase tracking-[0.15em] shrink-0 mb-1"
                style={{ color: "rgba(250,247,240,0.4)" }}>
                View All
              </Link>
            </div>

            {/* Mobile: horizontal scroll; Desktop: bento grid */}
            <div className="flex md:hidden overflow-x-auto gap-3 px-5 pb-4 scrollbar-none">
              {categories.map((cat, i) => (
                <Link key={cat.id} href={`/shop?category=${cat.slug}`}
                  className="relative overflow-hidden rounded-2xl shrink-0 active:scale-[0.97] transition-transform flex flex-col"
                  style={{ width: "68vw", maxWidth: "260px", minHeight: "300px" }}>
                  {/* Solid background for transparent PNGs */}
                  <div className="absolute inset-0" style={{ background: "#faf7f0" }} />
                  {cat.imageUrl && (
                    <Image src={cat.imageUrl} alt={cat.name} fill sizes="68vw" className="object-cover" />
                  )}
                  {/* Always-visible text panel */}
                  <div className="absolute inset-x-0 bottom-0 p-5 pt-20"
                    style={{ background: "linear-gradient(to top, rgba(11,11,20,0.92) 50%, transparent 100%)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] mb-1" style={{ color: "rgba(201,168,76,0.75)" }}>
                      Collection
                    </p>
                    <h3 className="font-['Playfair_Display'] text-[1.2rem] font-bold text-white leading-tight mb-3">{cat.name}</h3>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full"
                      style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c" }}>
                      Shop <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop bento */}
            <div className="hidden md:grid grid-cols-4 gap-3 px-14">
              {categories.map((cat, i) => (
                <Link key={cat.id} href={`/shop?category=${cat.slug}`}
                  className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                  <div className={`relative overflow-hidden ${i === 0 ? "h-full min-h-[480px]" : "aspect-[3/4]"}`}
                    style={{ background: "#faf7f0" }}>
                    {cat.imageUrl && (
                      <Image src={cat.imageUrl} alt={cat.name} fill
                        sizes={i === 0 ? "(max-width: 1280px) 50vw, 640px" : "(max-width: 1280px) 25vw, 320px"}
                        className="object-cover group-hover:scale-105 transition-transform duration-700" />
                    )}
                    <div className="absolute inset-0 flex flex-col justify-end p-7">
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: "rgba(201,168,76,0.7)" }}>
                        Collection
                      </p>
                      <h3 className={`font-['Playfair_Display'] font-bold text-white leading-tight ${i === 0 ? "text-[2.2rem]" : "text-[1.4rem]"}`}>
                        {cat.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-3 text-[11px] font-bold uppercase tracking-[0.2em] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                        style={{ color: "#c9a84c" }}>
                        Shop Now <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BESTSELLERS — horizontal scroll carousel on mobile ────────── */}
      {bestsellers.length > 0 && (
        <section style={{ background: "#faf7f0" }} className="py-14 md:py-28">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-end justify-between mb-8 px-5 md:px-14">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: "#c9a84c" }}>
                  Customer Favourites
                </p>
                <h2 className="font-['Playfair_Display'] font-bold leading-tight"
                  style={{ fontSize: "clamp(1.8rem, 6vw, 4rem)", color: "#12103a" }}>
                  Bestsellers
                </h2>
              </div>
              <Link href="/shop"
                className="text-[11px] font-bold uppercase tracking-[0.15em] shrink-0 mb-1"
                style={{ color: "#12103a" }}>
                See all
              </Link>
            </div>

            {/* Mobile carousel */}
            <div className="flex md:hidden overflow-x-auto gap-3 px-5 pb-3 scrollbar-none">
              {bestsellers.slice(0, 6).map((p: Product) => (
                <div key={p.id} className="shrink-0" style={{ width: "60vw", maxWidth: "220px" }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>

            {/* Desktop grid */}
            <div className="hidden md:grid grid-cols-4 gap-6 px-14">
              {bestsellers.slice(0, 4).map((p: Product) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            <div className="text-center mt-10 md:mt-16 px-5">
              <Link href="/shop"
                className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-10 py-4 text-[12px] font-bold uppercase tracking-[0.2em] rounded-full border-2 transition-all active:scale-95"
                style={{ borderColor: "#12103a", color: "#12103a" }}>
                View All Products
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── NEW ARRIVALS ─────────────────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section style={{ background: "#1a0d2e" }} className="py-14 md:py-28">
          <div className="max-w-[1280px] mx-auto px-5 md:px-14">

            {/* Header */}
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: "#c9a84c" }}>
                Just Dropped
              </p>
              <div className="flex items-end justify-between">
                <h2 className="font-['Playfair_Display'] font-bold leading-[1.0]"
                  style={{ fontSize: "clamp(2rem, 8vw, 4.5rem)", color: "#faf7f0" }}>
                  New <span style={{ color: "#c9a84c" }}>Arrivals</span>
                </h2>
                <Link href="/shop?sort=newest"
                  className="text-[11px] font-bold uppercase tracking-[0.15em] mb-1 shrink-0"
                  style={{ color: "rgba(250,247,240,0.7)" }}>
                  See all
                </Link>
              </div>
            </div>

            <p className="text-[14px] leading-relaxed mb-8 max-w-sm" style={{ color: "rgba(250,247,240,0.5)" }}>
              Fresh cuts, refined silhouettes. The newest Aura Goli pieces — before everyone else has them.
            </p>

            {/* Mobile: 2-column grid */}
            <div className="grid grid-cols-2 gap-3 md:hidden">
              {newArrivals.slice(0, 4).map((p: Product) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="group active:scale-[0.97] transition-transform">
                  <div className="relative overflow-hidden rounded-xl mb-2.5" style={{ aspectRatio: "3/4", background: "#2d1a4a" }}>
                    {p.images?.[0] ? (
                      <Image src={p.images[0].url} alt={p.name} fill sizes="50vw" className="object-cover opacity-85" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl" style={{ color: "rgba(201,168,76,0.3)" }}>checkroom</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                        style={{ background: "#c9a84c", color: "#0b0b14" }}>New</span>
                    </div>
                  </div>
                  <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: "#faf7f0" }}>{p.name}</p>
                  <p className="text-[13px] font-bold" style={{ color: "#c9a84c" }}>৳{Number(p.price).toLocaleString()}</p>
                </Link>
              ))}
            </div>

            {/* Desktop: editorial split */}
            <div className="hidden md:grid grid-cols-2 gap-20 items-center mt-12">
              <div className="grid grid-cols-2 gap-3">
                {newArrivals.slice(0, 4).map((p: Product) => (
                  <Link key={p.id} href={`/products/${p.slug}`} className="group">
                    <div className="relative overflow-hidden mb-3 rounded-xl" style={{ aspectRatio: "3/4", background: "#2d1a4a" }}>
                      {p.images?.[0] ? (
                        <Image src={p.images[0].url} alt={p.name} fill
                          sizes="(max-width: 1280px) 25vw, 280px"
                          className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl" style={{ color: "rgba(201,168,76,0.3)" }}>checkroom</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[13px] font-semibold truncate group-hover:text-[#c9a84c] transition-colors"
                      style={{ color: "#faf7f0" }}>{p.name}</p>
                    <p className="text-[13px]" style={{ color: "rgba(250,247,240,0.7)" }}>
                      ৳{Number(p.price).toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
              <div>
                <Link href="/shop?sort=newest"
                  className="inline-flex items-center gap-3 px-10 py-4 text-[12px] font-bold uppercase tracking-[0.2em] rounded-full transition-all"
                  style={{ background: "#c9a84c", color: "#0b0b14" }}>
                  Shop New Arrivals
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </div>

            {/* Mobile CTA */}
            <div className="md:hidden mt-8">
              <Link href="/shop?sort=newest"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-full text-[12px] font-bold uppercase tracking-[0.15em] active:scale-95 transition-transform"
                style={{ background: "#c9a84c", color: "#0b0b14" }}>
                Shop New Arrivals
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <div style={{ background: "#faf7f0" }}>
        <TestimonialSlider reviews={latestReviews} />
      </div>

      {/* ── LOOKBOOK — shoppable grid from real catalog imagery ───────── */}
      {lookbook.length > 0 && (
        <section style={{ background: "#12103a" }} className="py-14 md:py-24">
          <div className="max-w-[1280px] mx-auto px-5 md:px-14">
            <div className="text-center mb-8 md:mb-14">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: "#c9a84c" }}>
                The Lookbook
              </p>
              <h2 className="font-['Playfair_Display'] text-[1.8rem] md:text-[2.8rem] font-bold" style={{ color: "#faf7f0" }}>
                Styled by Aura
              </h2>
              <p className="mt-2 text-[13px]" style={{ color: "rgba(250,247,240,0.65)" }}>
                Tap a piece to shop the look
              </p>
            </div>

            {/* 3-col on mobile, 6-col on desktop */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
              {lookbook.map((img, i) => (
                <Link key={i} href={`/products/${img.slug}`}
                  className="aspect-square relative overflow-hidden rounded-lg block active:scale-[0.97] transition-transform">
                  <Image src={img.src} alt={img.alt} fill
                    sizes="(max-width: 768px) 33vw, 16vw"
                    className="object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 active:opacity-100 md:hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "rgba(201,168,76,0.2)" }}>
                    <span className="material-symbols-outlined text-xl" style={{ color: "#c9a84c" }}>shopping_bag</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── WHY US — 3 quick value props ─────────────────────────────── */}
      <section style={{ background: "#0b0b14" }} className="py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-14">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: "verified", title: "Lifetime Quality", body: "Stitching, printing, and fabric quality guaranteed. If it fails, we replace it — no questions." },
              { icon: "eco", title: "Ethically Sourced", body: "100% Supima cotton from GOTS-certified mills. Ethical wages, audited annually." },
              { icon: "local_shipping", title: "Free Delivery", body: "Free shipping on all orders above ৳2,000. Same-day delivery across Dhaka." },
            ].map((v) => (
              <div key={v.title} className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ background: "rgba(250,247,240,0.03)", border: "1px solid rgba(250,247,240,0.06)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: "#c9a84c" }}>{v.icon}</span>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: "#faf7f0" }}>{v.title}</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(250,247,240,0.4)" }}>{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────────────────────── */}
      <section className="py-16 md:py-28 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0b0b14 0%, #1a0d2e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(ellipse 60% 50% at 50% 110%, rgba(201,168,76,0.15) 0%, transparent 70%)" }} />
        <div className="relative max-w-[1280px] mx-auto px-5 md:px-14 text-center">
          <div className="max-w-xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] mb-5" style={{ color: "#c9a84c" }}>
              Inner Circle
            </p>
            <h2 className="font-['Playfair_Display'] font-bold leading-[1.05] mb-5"
              style={{ fontSize: "clamp(2rem, 8vw, 4rem)", color: "#faf7f0" }}>
              Join the <span style={{ color: "#c9a84c" }}>Aura</span>
            </h2>
            <p className="text-[14px] leading-relaxed mb-8" style={{ color: "rgba(250,247,240,0.7)" }}>
              First access to limited drops, exclusive events, and stories behind each collection. No spam — just the good stuff.
            </p>
            <NewsletterForm />
            <p className="mt-5 text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(250,247,240,0.2)" }}>
              By subscribing you agree to our Privacy Policy
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}

/* ── Types & ProductCard ─────────────────────────────────────────────────── */

interface Product {
  id: string; name: string; slug: string; price: number;
  images: { url: string }[];
  averageRating?: number;
  _count?: { reviews: number };
  variants?: { stockQuantity: number }[];
}

function ProductCard({ product }: { product: Product }) {
  const stock = (product.variants ?? []).reduce((s, v) => s + v.stockQuantity, 0);
  const lowStock = stock > 0 && stock <= 6;
  return (
    <Link href={`/products/${product.slug}`} className="group block active:scale-[0.97] transition-transform">
      <div className="relative overflow-hidden mb-3 rounded-xl"
        style={{ aspectRatio: "3/4", background: "#ede8e0" }}>
        {lowStock && (
          <span className="absolute top-2.5 left-2.5 z-10 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ background: "rgba(186,26,26,0.92)", color: "#fff" }}>
            Only {stock} left
          </span>
        )}
        {product.images?.[0] ? (
          <Image src={product.images[0].url} alt={product.name} fill
            sizes="(max-width: 768px) 60vw, (max-width: 1280px) 25vw, 280px"
            className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #ede8e0, #d4cec5)" }}>
            <span className="material-symbols-outlined text-5xl" style={{ color: "#b8b0a5" }}>checkroom</span>
          </div>
        )}
        {/* Slide-up CTA */}
        <div className="absolute bottom-0 inset-x-0 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-b-xl"
          style={{ background: "#c9a84c", color: "#0b0b14" }}>
          Quick View
        </div>
      </div>
      <p className="text-[13px] font-semibold leading-snug" style={{ color: "#12103a" }}>{product.name}</p>
      {product.averageRating && product.averageRating > 0 ? (
        <div className="flex items-center gap-0.5 mt-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="text-[11px]"
              style={{ color: i < Math.round(product.averageRating!) ? "#c9a84c" : "#d4cec5" }}>★</span>
          ))}
          <span className="text-[10px] ml-1" style={{ color: "#8a8480" }}>({product._count?.reviews ?? 0})</span>
        </div>
      ) : null}
      <p className="text-[14px] font-bold mt-0.5" style={{ color: "#3d2b7a" }}>৳{Number(product.price).toLocaleString()}</p>
    </Link>
  );
}
