import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import NewsletterForm from "@/components/storefront/NewsletterForm";
import TestimonialSlider from "@/components/storefront/TestimonialSlider";
import Hero3D from "@/components/storefront/Hero3D";

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

      {/* ── WHY SHOP WITH US ─────────────────────────────────────────── */}
      <section style={{ background: "#faf7f0" }} className="py-14 md:py-24">
        <div className="max-w-[1280px] mx-auto px-5 md:px-14">

          {/* Header */}
          <div className="text-center mb-10 md:mb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: "#c9a84c" }}>
              Why Choose Us
            </p>
            <h2 className="font-['Playfair_Display'] font-bold leading-tight"
              style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)", color: "#12103a" }}>
              Shop with confidence
            </h2>
          </div>

          {/* Benefits grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
            {[
              { icon: "local_shipping", title: "Free Delivery", sub: "On orders over ৳2,000", color: "#3d2b7a" },
              { icon: "autorenew", title: "30-Day Returns", sub: "No questions asked", color: "#c9a84c" },
              { icon: "verified", title: "100% Authentic", sub: "Genuine premium quality", color: "#3d2b7a" },
              { icon: "support_agent", title: "Live Support", sub: "We reply within 24 hrs", color: "#c9a84c" },
            ].map((b) => (
              <div key={b.title}
                className="flex flex-col items-center text-center px-4 py-6 rounded-2xl"
                style={{ background: "white", border: "1px solid rgba(11,11,20,0.06)", boxShadow: "0 2px 16px rgba(11,11,20,0.04)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: b.color === "#c9a84c" ? "rgba(201,168,76,0.1)" : "rgba(61,43,122,0.08)" }}>
                  <span className="material-symbols-outlined text-2xl" style={{ color: b.color, fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
                </div>
                <p className="font-bold text-[14px] mb-1" style={{ color: "#12103a" }}>{b.title}</p>
                <p className="text-[12px] leading-snug" style={{ color: "#8a8585" }}>{b.sub}</p>
              </div>
            ))}
          </div>

          {/* Social proof bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-5 rounded-2xl"
            style={{ background: "linear-gradient(135deg, #12103a 0%, #1e1a4a 100%)" }}>
            <div className="flex items-center gap-4">
              {/* Star rating */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#c9a84c"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ))}
                  <span className="font-bold text-[15px] ml-1" style={{ color: "#faf7f0" }}>4.9</span>
                </div>
                <p className="text-[11px]" style={{ color: "rgba(250,247,240,0.5)" }}>from 1,200+ happy customers</p>
              </div>
              <div className="w-px h-10 hidden md:block" style={{ background: "rgba(250,247,240,0.1)" }} />
              <p className="text-[13px] font-medium" style={{ color: "rgba(250,247,240,0.7)" }}>
                "Best quality tees I've found in Bangladesh. Will order again!"
              </p>
            </div>
            <Link href="/shop"
              className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#c9a84c", color: "#0b0b14" }}>
              Shop Now
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
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
                    <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover" />
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
                  style={{ color: "rgba(250,247,240,0.45)" }}>
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
                      <Image src={p.images[0].url} alt={p.name} fill className="object-cover opacity-85" />
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
                          className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl" style={{ color: "rgba(201,168,76,0.3)" }}>checkroom</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[13px] font-semibold truncate group-hover:text-[#c9a84c] transition-colors"
                      style={{ color: "#faf7f0" }}>{p.name}</p>
                    <p className="text-[13px]" style={{ color: "rgba(250,247,240,0.45)" }}>
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

      {/* ── COMMUNITY GRID ───────────────────────────────────────────── */}
      <section style={{ background: "#12103a" }} className="py-14 md:py-24">
        <div className="max-w-[1280px] mx-auto px-5 md:px-14">
          <div className="text-center mb-8 md:mb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: "#c9a84c" }}>
              Community
            </p>
            <h2 className="font-['Playfair_Display'] text-[1.8rem] md:text-[2.8rem] font-bold" style={{ color: "#faf7f0" }}>
              As Seen On You
            </h2>
            <p className="mt-2 text-[13px]" style={{ color: "rgba(250,247,240,0.35)" }}>
              Tag @AuraGoli #VibeWithAura to be featured
            </p>
          </div>

          {/* 3-col on mobile, 6-col on desktop */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
            {[
              { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-S5NXdww9MHc6phc6VZ7ocisNV1r5dPFiOVQgstRMqjx55YkCm1NDjX2_pYzajxBAPpz4td8wHg_R1HDqapJkgdMuuesgj1ntsLK1_vVhawEp_FPU67Jkxy9eqyMWixdQPrtDEAeGckMTykbVc-mwSWOcij2junZgeqazCi0tsh_Md_OHXoov0X11R2kVluAsPrA9LtIOHHdln8-yI01jz8rtMYqsFYuBhwgq3103pELnYMeFkXd9moDJOlApjJu-rMqS1HvGE5I", alt: "Community photo 1" },
              { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCkropPmpETmrWSyMUJ1xDDT7ifO_fhsH4mF1vc_2mVVMhI6tSiBfOoSRH8NJZCUvALFazgjuws1NKBiaNZZjLHmEuwoKYvYnLCWzAmFq9pMxI7hC4C0wLYo3T1SqdHTvPrQ2_KgqIHy9V6sb7ezD8_L5ahkFrADfVhTSnjMJBtBGFb27Okvm6zmjza4QrBivdV0jlTYO5TNfRmXASEf_QwvFakli6Cvtt4VbYatne3WBH_fKZfcjYcercEVUKvTouC458p6L8s09M", alt: "Community photo 2" },
              { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFXs0hgnNBfXLCpbLKKnmgAB9HuzkHAC_l3S5ErFeJF7cRxUn_yAi8pkd2Fo-o85H8vvMyTM5Sz1FuQb8DkUngNN0Q98u048jKiCut3EQcQ19hi_MtaxgRK2s1w_yWUzfSM9JZA5f0mVM6waXk5Qgl-Cp2Yz_J2WnFAHMpgCosbouu3ol6cd5raufSgzmvTdJJUsBqdzFpRMlXG4Jp3mHWpz8HJ-EPaCC_BBWqXD4WjXpTcmN-wo2BRxQrWsq48yPGpMnGCtNeaCg", alt: "Community photo 3" },
              { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCINZwFC_VvRhIGLMrXJ5a_rAeclEWw9kqDNUz2sVzpd65ZL7GgoXPwWjvOfiR_Te67A6ZtIEVS0revvpTI0EWGXdpCMkxfp68eeZaK3AyzMUg_ZPffuDuy7dSrZd9wUPmtDJ3CqWuVwfxMcnApp8KyxqgUXmNJHsdfv_Ukyk9TTYVWdRGMRPhMrXo2GhFHwvKjARxhniEiHWakjftZwzbtPpuB8PmfiaQGhNZT22bWYyHN0_pA9QYHDkDmEtgzkyRnI03kTF1M7IQ", alt: "Community photo 4" },
              { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuATkmBaM_30Pw07gDyvZX-dhJk7ztyasC5agqS2VcOgY7ZheqD5MLPA4v4Wk_pikuNGUUtYaeyKdEj8q6IAQTicBE3YL4LH3U0lyo8Gud4vWA3X-hufvrY86d6dEeYpUiFynuAmlmXBO90VeSf4sDC3E6cZMiH0gGjXqoSNdb1PPEHbSv-UhpreQaguJJU-Palfns9ahLWMlEvRXHz2oBq2ZX-SWxcDxqZO5Y_XdUJ7vkcO_0tqQjwJgEd7Cr521MLdWrPyfCd8FVU", alt: "Community photo 5" },
              { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDfozlM0A1Hq9UUPeIavlDtdAU39gsO5QC-zQd3Z7SBsTXvDrH2Qc2ntVbDGT7qv7TTPjA9Ckytrc9j9mRd806SHUuCWlW0mvQ53dt6DToS4JS_uInu7FSqa1hS1K0FuAk2dnwX2uaj9oY0EoWVtR7b03qZOALtJtDWwjD3NcOpxM7NoFArCmrinz2hSwuRPuTZ_fDwCE6aXsM7dr3pyLwmn2S4-MrFnLDp0DL-0JJJbGoN2A8Fwawl_5CbMrH1lo95Zr0VdO2l3M4", alt: "Community photo 6" },
            ].map((img, i) => (
              <div key={i} className="aspect-square relative overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.alt}
                  className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 active:opacity-100 md:hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "rgba(201,168,76,0.2)" }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: "#c9a84c", fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
            <p className="text-[14px] leading-relaxed mb-8" style={{ color: "rgba(250,247,240,0.45)" }}>
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
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block active:scale-[0.97] transition-transform">
      <div className="relative overflow-hidden mb-3 rounded-xl"
        style={{ aspectRatio: "3/4", background: "#ede8e0" }}>
        {product.images?.[0] ? (
          <Image src={product.images[0].url} alt={product.name} fill
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
