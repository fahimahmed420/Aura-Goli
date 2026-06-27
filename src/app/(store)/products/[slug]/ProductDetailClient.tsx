"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RecentlyViewed, { trackView } from "@/components/storefront/RecentlyViewed";
import { trackAddToCart } from "@/lib/analytics";

function isVideo(url: string) { return /\.(mp4|webm|ogg)$/i.test(url); }

interface Variant {
  id: string; color: string | null; size: string | null; sku: string;
  stockQuantity: number; priceModifier: number;
}
interface Review {
  id: string; rating: number; title: string | null; body: string;
  helpfulCount: number; createdAt: string; user: { name: string } | null;
}
interface Product {
  id: string; name: string; slug: string; price: number; compareAtPrice?: number;
  description?: string; material?: string; careInstructions?: string;
  images: { id: string; url: string; altText: string | null }[];
  variants: Variant[];
  reviews: Review[];
  averageRating?: number;
  category: { name: string; slug: string } | null;
}
interface RelatedProduct {
  id: string; name: string; slug: string; price: number;
  images: { url: string }[];
}

export default function ProductDetailClient({ product, related }: { product: Product; related: RelatedProduct[] }) {
  const router = useRouter();
  const [activeImage, setActiveImage]     = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize]   = useState<string | null>(null);
  const [qty, setQty]                     = useState(1);
  const [activeTab, setActiveTab]         = useState<"description" | "reviews">("description");
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [addedToCart, setAddedToCart]     = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");
  const [colorError, setColorError]       = useState(false);
  const [sizeError, setSizeError]         = useState(false);
  const [wishlisted, setWishlisted]       = useState(false);
  const [sizeChart, setSizeChart]         = useState<Array<{size:string;chest:string;length:string;shoulder:string}>>([]);
  const touchStartX = useRef(0);
  const colorRef = useRef<HTMLDivElement>(null);
  const sizeRef  = useRef<HTMLDivElement>(null);
  const tabsRef  = useRef<HTMLDivElement>(null);
  const atcRef   = useRef<HTMLButtonElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  function openSizeChart() {
    setSizeModalOpen(true);
  }

  useEffect(() => {
    trackView({ id: product.id, slug: product.slug, name: product.name, price: product.price, imageUrl: product.images[0]?.url });
  }, [product.id, product.slug, product.name, product.price, product.images]);

  useEffect(() => {
    const token = localStorage.getItem("ag_authed");
    if (!token) return;
    fetch("/api/account/wishlist", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const wishlisted = (d.items ?? []).some((i: { product: { id: string } }) => i.product.id === product.id);
        setWishlisted(wishlisted);
      })
      .catch(() => {});
  }, [product.id]);

  useEffect(() => {
    fetch("/api/size-chart")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rows) setSizeChart(d.rows); })
      .catch(() => {});
  }, []);

  const [copied, setCopied] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  function shareProduct() { setShowShareSheet(true); }
  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowShareSheet(false); }, 1800);
    });
  }
  function nativeShare() {
    navigator.share?.({ title: product.name, url: window.location.href })
      .then(() => setShowShareSheet(false))
      .catch(() => {});
  }

  function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    const token = localStorage.getItem("ag_authed");
    if (!token) { router.push("/login"); return; }
    const prev = wishlisted;
    setWishlisted(!prev);
    fetch("/api/account/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: product.id }),
    }).catch(() => setWishlisted(prev));
  }

  const colors = [...new Set(product.variants.map((v) => v.color).filter(Boolean))] as string[];
  const sizes  = [...new Set(product.variants.map((v) => v.size).filter(Boolean))] as string[];

  const activeVariant = product.variants.find(
    (v) => (!selectedColor || v.color === selectedColor) && (!selectedSize || v.size === selectedSize)
  );
  const inStock    = activeVariant ? activeVariant.stockQuantity > 0 : product.variants.some((v) => v.stockQuantity > 0);
  const lowStock   = activeVariant && activeVariant.stockQuantity > 0 && activeVariant.stockQuantity <= 5 ? activeVariant.stockQuantity : null;
  const finalPrice = Number(product.price) + Number(activeVariant?.priceModifier ?? 0);
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPct = hasDiscount ? Math.round(((Number(product.compareAtPrice) - finalPrice) / Number(product.compareAtPrice)) * 100) : 0;
  const rating = product.averageRating ?? 0;

  function validateSelection(): boolean {
    let valid = true;
    if (colors.length > 0 && !selectedColor) {
      setColorError(true);
      setTimeout(() => setColorError(false), 800);
      colorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      valid = false;
    }
    if (sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 800);
      if (valid) sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      valid = false;
    }
    return valid;
  }

  function addToCart(): boolean {
    if (!validateSelection()) return false;
    const cart = JSON.parse(localStorage.getItem("cart") ?? "[]");
    const variantId = activeVariant?.id ?? `${product.id}-default`;
    const existing = cart.find((i: { variantId: string }) => i.variantId === variantId);
    if (existing) { existing.quantity += qty; }
    else {
      cart.push({
        variantId, productId: product.id, name: product.name, price: finalPrice,
        color: selectedColor, size: selectedSize,
        image: product.images[0]?.url ?? null, quantity: qty, sku: activeVariant?.sku,
        categorySlug: product.category?.slug ?? null,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    trackAddToCart({ id: product.id, name: product.name, price: finalPrice, quantity: qty });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2200);
    return true;
  }

  function buyNow() {
    if (addToCart()) router.push("/cart");
  }

  useEffect(() => {
    const el = atcRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setShowStickyBar(!entry.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setActiveImage((i) => Math.min(product.images.length - 1, i + 1));
    else         setActiveImage((i) => Math.max(0, i - 1));
  }

  const tabs = [
    { key: "description" as const, label: "Product Details" },
    { key: "reviews" as const, label: `Reviews (${product.reviews.length})` },
  ];
  const tabIdx = tabs.findIndex(t => t.key === activeTab);
  const tabWidthPct = 100 / tabs.length;

  const sizeChartRows = sizeChart.length > 0 ? sizeChart : [
    { size: "XS", chest: '34–36"', length: '26"', shoulder: '15"' },
    { size: "S",  chest: '36–38"', length: '27"', shoulder: '16"' },
    { size: "M",  chest: '38–40"', length: '28"', shoulder: '17"' },
    { size: "L",  chest: '40–42"', length: '29"', shoulder: '18"' },
    { size: "XL", chest: '42–44"', length: '30"', shoulder: '19"' },
    { size: "XXL",chest: '44–46"', length: '31"', shoulder: '20"' },
  ];

  return (
    <>
    <style>{`
      @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
      @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      .pd-fade-up { animation: fadeUp 0.55s cubic-bezier(.4,0,.2,1) both; }
      .pd-fade-in { animation: fadeIn 0.4s ease both; }
      .img-zoom { overflow:hidden; }
      .img-zoom img { transition: transform 0.65s cubic-bezier(.4,0,.2,1); }
      .img-zoom:hover img { transform: scale(1.05); }
      .tab-btn { transition: color 0.2s; }
      .size-pill { transition: all 0.15s; }
      .atc-btn { transition: all 0.25s; }
      .atc-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(11,11,20,0.25); }
      @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
      .shake { animation: shake 0.4s ease; }
      @keyframes slideDown { from { opacity:0; transform:translateY(-100%) } to { opacity:1; transform:none } }
      .sticky-bar { animation: slideDown 0.25s cubic-bezier(.4,0,.2,1) both; }
      @keyframes shareSlideDown { from { opacity:0; transform:translateY(-12px) } to { opacity:1; transform:none } }
      .share-panel { animation: shareSlideDown 0.22s cubic-bezier(.4,0,.2,1) both; }
    `}</style>

    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", background: "#faf7f0", minHeight: "100vh", paddingTop: "4px" }}>

      {/* ═══════════════════════════════════════════════════════
          MOBILE LAYOUT
      ═══════════════════════════════════════════════════════ */}
      <div className="md:hidden">

        {/* Breadcrumbs */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-1.5 text-[11px] flex-wrap" style={{ color: "rgba(18,16,58,0.4)" }}>
          <Link href="/" className="hover:text-[#0b0b14] transition-colors">Home</Link>
          <span style={{ color: "rgba(18,16,58,0.2)" }}>/</span>
          <Link href="/shop" className="hover:text-[#0b0b14] transition-colors">Shop</Link>
          {product.category && (
            <>
              <span style={{ color: "rgba(18,16,58,0.2)" }}>/</span>
              <Link href={`/shop?category=${product.category.slug}`} className="hover:text-[#0b0b14] transition-colors">{product.category.name}</Link>
            </>
          )}
          <span style={{ color: "rgba(18,16,58,0.2)" }}>/</span>
          <span className="font-semibold truncate max-w-[160px]" style={{ color: "#0b0b14" }}>{product.name}</span>
        </div>

        {/* Image gallery — main image + thumbnail strip (same approach as desktop) */}
        <div className="px-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="flex gap-3">
            {/* Vertical thumbnail strip */}
            {product.images.length > 1 && (
              <div className="flex flex-col gap-2" style={{ width: "52px", flexShrink: 0 }}>
                {product.images.map((img, i) => (
                  <button key={img.id} onClick={() => setActiveImage(i)}
                    className="relative rounded-lg overflow-hidden transition-all"
                    style={{
                      width: "52px", height: "66px",
                      border: `2px solid ${i === activeImage ? "#0b0b14" : "transparent"}`,
                      background: "#ede9e1",
                      opacity: i === activeImage ? 1 : 0.5,
                      flexShrink: 0,
                    }}>
                    {isVideo(img.url) ? (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#1a1a2e" }}>
                        <span className="material-symbols-outlined text-[16px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                      </div>
                    ) : (
                      <Image src={img.url} alt={img.altText ?? ""} fill className="object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Main image */}
            <div className="flex-1 relative rounded-xl img-zoom" style={{ aspectRatio: "3/4", background: "#ede9e1" }}>
              {product.images[activeImage] ? (
                isVideo(product.images[activeImage].url) ? (
                  <video src={product.images[activeImage].url}
                    autoPlay muted loop playsInline className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Image src={product.images[activeImage].url}
                    alt={product.images[activeImage].altText ?? product.name}
                    fill className="object-cover rounded-xl" priority />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                  <span className="material-symbols-outlined text-5xl" style={{ color: "#c8c6c5" }}>checkroom</span>
                </div>
              )}
              {hasDiscount && (
                <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: "#ba1a1a", color: "white" }}>
                  -{discountPct}%
                </span>
              )}
              {/* Wishlist + Share — same style as desktop */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                <button onClick={toggleWishlist}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: wishlisted ? "rgba(186,26,26,0.1)" : "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 2px 8px rgba(11,11,20,0.12)",
                  }}>
                  <span className="material-symbols-outlined text-[18px]"
                    style={{ color: wishlisted ? "#ba1a1a" : "#444748", fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}>
                    favorite
                  </span>
                </button>
                <button onClick={shareProduct}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 2px 8px rgba(11,11,20,0.12)",
                  }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: "#444748" }}>ios_share</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Product info */}
        <div className="px-4 mt-3 pd-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              {product.category && (
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-0.5" style={{ color: "#c9a84c" }}>
                  {product.category.name}
                </p>
              )}
              <h1 className="font-['Playfair_Display'] text-[1.3rem] font-bold leading-snug" style={{ color: "#0b0b14" }}>
                {product.name}
              </h1>
            </div>
            <div className="shrink-0 text-right pt-1">
              <p className="font-['Playfair_Display'] text-[1.3rem] font-bold leading-none" style={{ color: "#0b0b14" }}>
                ৳{finalPrice.toLocaleString()}
              </p>
              {hasDiscount && (
                <p className="text-[11px] line-through mt-0.5" style={{ color: "rgba(11,11,20,0.35)" }}>
                  ৳{Number(product.compareAtPrice).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          {rating > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-[12px]"
                    style={{ color: i < Math.round(rating) ? "#c9a84c" : "#e2e2e2" }}>★</span>
                ))}
              </div>
              <span className="text-[11px]" style={{ color: "rgba(11,11,20,0.45)" }}>
                {rating.toFixed(1)} · {product.reviews.length} review{product.reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          <div style={{ height: "1px", background: "rgba(11,11,20,0.07)", marginBottom: "12px" }} />

          {/* Color selector */}
          {colors.length > 0 && (
            <div ref={colorRef} className={`mb-3 ${colorError ? "shake" : ""}`}
              style={colorError ? { padding: "6px 10px", background: "rgba(186,26,26,0.05)", border: "1px solid rgba(186,26,26,0.25)", borderRadius: "12px" } : undefined}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: colorError ? "#ba1a1a" : "rgba(11,11,20,0.45)" }}>
                  Colour{colorError
                    ? <span className="normal-case tracking-normal font-semibold"> — select</span>
                    : selectedColor
                    ? <span className="normal-case tracking-normal font-normal" style={{ color: "#0b0b14" }}> · {selectedColor}</span>
                    : null}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {colors.map((c) => (
                  <button key={c}
                    onClick={() => { setSelectedColor(c === selectedColor ? null : c); setColorError(false); }}
                    title={c}
                    className="w-8 h-8 rounded-full transition-all flex items-center justify-center"
                    style={{
                      backgroundColor: c.toLowerCase() === "white" ? "#f9f9f9" : c.toLowerCase() === "beige" ? "#d4b896" : c.toLowerCase(),
                      border: selectedColor === c ? "2px solid #0b0b14" : "2px solid transparent",
                      boxShadow: selectedColor === c ? "0 0 0 2px #faf7f0, 0 0 0 4px #0b0b14" : "0 0 0 1px rgba(11,11,20,0.15)",
                    }}>
                    {selectedColor === c && (
                      <span className="material-symbols-outlined text-[11px]"
                        style={{ color: ["white","beige","yellow","cream"].includes(c.toLowerCase()) ? "#0b0b14" : "white" }}>
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size selector */}
          {sizes.length > 0 && (
            <div ref={sizeRef} className={`mb-3 ${sizeError ? "shake" : ""}`}
              style={sizeError ? { padding: "6px 10px", background: "rgba(186,26,26,0.05)", border: "1px solid rgba(186,26,26,0.25)", borderRadius: "12px" } : undefined}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: sizeError ? "#ba1a1a" : "rgba(11,11,20,0.45)" }}>
                  Size{sizeError && <span className="normal-case tracking-normal font-semibold"> — select</span>}
                </p>
                <button onClick={openSizeChart} className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: "#c9a84c" }}>
                  <span className="material-symbols-outlined text-[13px]">straighten</span>
                  Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => {
                  const variantForSize = product.variants.find((v) => v.size === s && (!selectedColor || v.color === selectedColor));
                  const oos = variantForSize ? variantForSize.stockQuantity === 0 : false;
                  return (
                    <button key={s}
                      onClick={() => { if (!oos) { setSelectedSize(s === selectedSize ? null : s); setSizeError(false); } }}
                      disabled={oos}
                      className="size-pill min-w-[44px] h-9 px-3 rounded-lg text-[12px] font-semibold text-center"
                      style={{
                        background: selectedSize === s ? "#0b0b14" : oos ? "transparent" : "white",
                        color: selectedSize === s ? "#faf7f0" : oos ? "rgba(11,11,20,0.2)" : "#0b0b14",
                        border: `1.5px solid ${selectedSize === s ? "#0b0b14" : oos ? "rgba(11,11,20,0.08)" : sizeError ? "rgba(186,26,26,0.35)" : "rgba(11,11,20,0.13)"}`,
                        textDecoration: oos ? "line-through" : "none",
                        cursor: oos ? "not-allowed" : "pointer",
                      }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scarcity indicator */}
          {lowStock && (
            <p className="text-[11px] font-semibold mb-3" style={{ color: "#ba1a1a" }}>
              ⚠ Only {lowStock} left in this size — order soon
            </p>
          )}

          {/* Material */}
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl"
            style={{ background: "rgba(11,11,20,0.03)", border: "1px solid rgba(11,11,20,0.07)" }}>
            <span className="material-symbols-outlined text-[15px]" style={{ color: "#3d2b7a" }}>texture</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(11,11,20,0.4)" }}>Material</span>
            <span className="text-[12px] font-semibold ml-auto" style={{ color: "#0b0b14" }}>{product.material || "100% Cotton"}</span>
          </div>

          {/* Quantity + ATC */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(11,11,20,0.45)" }}>Quantity</span>
              <div className="flex items-center rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(11,11,20,0.13)", background: "white" }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center" style={{ color: "#0b0b14" }}>
                  <span className="material-symbols-outlined text-[17px]">remove</span>
                </button>
                <span className="w-9 text-center text-[13px] font-bold" style={{ color: "#0b0b14" }}>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)}
                  className="w-9 h-9 flex items-center justify-center" style={{ color: "#0b0b14" }}>
                  <span className="material-symbols-outlined text-[17px]">add</span>
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => addToCart()} disabled={!inStock}
                className="flex-1 h-11 rounded-xl text-[13px] font-bold atc-btn active:scale-[0.98]"
                style={{
                  background: addedToCart ? "#16a34a" : inStock ? "#0b0b14" : "rgba(11,11,20,0.1)",
                  color: addedToCart ? "white" : inStock ? "#faf7f0" : "rgba(11,11,20,0.3)",
                }}>
                {addedToCart ? "✓ Added to Bag" : inStock ? `Add to Bag — ৳${(finalPrice * qty).toLocaleString()}` : "Out of Stock"}
              </button>
              <button onClick={buyNow} disabled={!inStock}
                className="h-11 px-4 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98] shrink-0"
                style={{
                  border: "1.5px solid rgba(11,11,20,0.18)",
                  color: inStock ? "#0b0b14" : "rgba(11,11,20,0.25)",
                  background: "white",
                }}>
                Buy Now
              </button>
            </div>
            {!inStock && <NotifyMeButton productId={product.id} variantId={activeVariant?.id} size={selectedSize} />}
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-3 py-3 mb-2"
            style={{ borderTop: "1px solid rgba(11,11,20,0.06)", borderBottom: "1px solid rgba(11,11,20,0.06)" }}>
            {[
              { icon: "local_shipping", text: "Free ৳2k+" },
              { icon: "autorenew", text: "30-day return" },
              { icon: "verified_user", text: "Authentic" },
            ].map((t) => (
              <div key={t.icon} className="flex items-center gap-1.5 flex-1">
                <span className="material-symbols-outlined text-[15px]" style={{ color: "#3d2b7a" }}>{t.icon}</span>
                <span className="text-[10px] font-medium" style={{ color: "#5a5358" }}>{t.text}</span>
              </div>
            ))}
          </div>

          {/* Accordion sections */}
          {[
            {
              key: "details",
              label: "Product Details",
              content: (
                <div className="space-y-3 text-[13px] leading-relaxed" style={{ color: "#5a5358" }}>
                  <p>{product.description ?? "Premium quality garment with exceptional finish and comfort."}</p>
                  {product.material && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: "rgba(11,11,20,0.45)" }}>Material</p>
                      <p>{product.material}</p>
                    </div>
                  )}
                  {product.careInstructions && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: "rgba(11,11,20,0.45)" }}>Care</p>
                      <p>{product.careInstructions}</p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "reviews",
              label: `Reviews${product.reviews.length > 0 ? ` (${product.reviews.length})` : ""}`,
              content: <ReviewsTab slug={product.slug} initialReviews={product.reviews} initialAvg={product.averageRating ?? 0} />,
            },
          ].map(({ key, label, content }) => (
            <div key={key} style={{ borderTop: "1px solid rgba(11,11,20,0.07)" }}>
              <button
                onClick={() => setOpenAccordion(openAccordion === key ? null : key)}
                className="flex items-center justify-between w-full py-3.5">
                <span className="text-[13px] font-semibold" style={{ color: "#0b0b14" }}>{label}</span>
                <span className="material-symbols-outlined text-[18px] transition-transform"
                  style={{ color: "rgba(11,11,20,0.35)", transform: openAccordion === key ? "rotate(180deg)" : "none" }}>
                  expand_more
                </span>
              </button>
              {openAccordion === key && (
                <div className="pb-4">{content}</div>
              )}
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(11,11,20,0.07)" }} />
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-6 pb-8">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="font-['Playfair_Display'] text-[1rem] font-bold" style={{ color: "#0b0b14" }}>
                You Might Like
              </h2>
              <Link href="/shop" className="text-[11px] font-semibold" style={{ color: "rgba(11,11,20,0.4)" }}>
                See all
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none px-4 pb-2">
              {related.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`}
                  className="shrink-0 active:scale-[0.97] transition-transform"
                  style={{ width: "40vw", maxWidth: "160px" }}>
                  <div className="relative rounded-xl overflow-hidden mb-1.5"
                    style={{ aspectRatio: "3/4", background: "#ede8e0" }}>
                    {p.images[0] ? (
                      <Image src={p.images[0].url} alt={p.name} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl" style={{ color: "#c8c6c5" }}>checkroom</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] font-semibold line-clamp-1" style={{ color: "#0b0b14" }}>{p.name}</p>
                  <p className="text-[12px] font-bold" style={{ color: "#3d2b7a" }}>৳{Number(p.price).toLocaleString()}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share panel — slides from top, works on both mobile & desktop */}
      {showShareSheet && (
        <div className="fixed inset-0 z-[70]" onClick={() => setShowShareSheet(false)}>
          <div className="share-panel absolute left-1/2 -translate-x-1/2 w-full max-w-sm px-4"
            style={{ top: "80px" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#faf7f0", border: "1px solid rgba(11,11,20,0.08)" }}>
              <div className="px-5 pt-4 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(11,11,20,0.35)" }}>Share this product</p>
              </div>
              <div className="px-3 pb-3 space-y-1.5">
                <button onClick={copyLink}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl active:scale-[0.98] transition-all"
                  style={{
                    background: copied ? "rgba(22,163,74,0.07)" : "white",
                    border: `1px solid ${copied ? "rgba(22,163,74,0.18)" : "rgba(11,11,20,0.06)"}`,
                  }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: copied ? "rgba(22,163,74,0.12)" : "rgba(61,43,122,0.08)" }}>
                    <span className="material-symbols-outlined text-[16px]" style={{ color: copied ? "#16a34a" : "#3d2b7a" }}>
                      {copied ? "check" : "link"}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-semibold" style={{ color: copied ? "#16a34a" : "#0b0b14" }}>
                      {copied ? "Link copied!" : "Copy link"}
                    </p>
                    <p className="text-[11px]" style={{ color: "rgba(11,11,20,0.4)" }}>
                      {copied ? "Paste it anywhere" : "Copy page URL"}
                    </p>
                  </div>
                </button>
                {typeof navigator !== "undefined" && !!navigator.share && (
                  <button onClick={nativeShare}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-xl active:scale-[0.98] transition-all"
                    style={{ background: "white", border: "1px solid rgba(11,11,20,0.06)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(61,43,122,0.08)" }}>
                      <span className="material-symbols-outlined text-[16px]" style={{ color: "#3d2b7a" }}>ios_share</span>
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-semibold" style={{ color: "#0b0b14" }}>More options</p>
                      <p className="text-[11px]" style={{ color: "rgba(11,11,20,0.4)" }}>Share via your apps</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ── Sticky ATC bar (desktop only, appears when ATC scrolls out of view) ── */}
      {showStickyBar && (
        <div className="sticky-bar hidden md:flex fixed top-0 inset-x-0 z-[55] items-center gap-6 px-8 lg:px-16 py-3"
          style={{ background: "rgba(11,11,20,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest truncate" style={{ color: "rgba(250,247,240,0.5)" }}>{product.category?.name}</p>
            <p className="font-['Playfair_Display'] text-base font-bold truncate" style={{ color: "#faf7f0" }}>{product.name}</p>
          </div>
          <p className="font-['Playfair_Display'] text-xl font-bold shrink-0" style={{ color: "#c9a84c" }}>৳{finalPrice.toLocaleString()}</p>
          <button onClick={() => addToCart()} disabled={!inStock}
            className="shrink-0 px-8 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all hover:bg-[#c9a84c] hover:text-[#0b0b14]"
            style={{ background: inStock ? "#faf7f0" : "rgba(250,247,240,0.2)", color: inStock ? "#0b0b14" : "rgba(250,247,240,0.3)", cursor: inStock ? "pointer" : "not-allowed" }}>
            {addedToCart ? "✓ Added" : "Add to Bag"}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          DESKTOP LAYOUT — FULL REDESIGN
      ═══════════════════════════════════════════════════════ */}
      <div className="hidden md:block" style={{ background: "#faf7f0" }}>

        {/* Breadcrumbs */}
        <div className="max-w-[1440px] mx-auto px-8 lg:px-16 py-4 flex items-center gap-2 text-xs" style={{ color: "rgba(18,16,58,0.4)" }}>
          <Link href="/" className="hover:text-[#0b0b14] transition-colors">Home</Link>
          <span style={{ color: "rgba(18,16,58,0.2)" }}>/</span>
          <Link href="/shop" className="hover:text-[#0b0b14] transition-colors">Shop</Link>
          {product.category && (
            <>
              <span style={{ color: "rgba(18,16,58,0.2)" }}>/</span>
              <Link href={`/shop?category=${product.category.slug}`} className="hover:text-[#0b0b14] transition-colors">{product.category.name}</Link>
            </>
          )}
          <span style={{ color: "rgba(18,16,58,0.2)" }}>/</span>
          <span className="font-semibold truncate max-w-[200px]" style={{ color: "#0b0b14" }}>{product.name}</span>
        </div>

        {/* Main product section */}
        <div className="max-w-[1440px] mx-auto px-8 lg:px-16 pb-20">
          <div className="flex gap-12 lg:gap-16 items-start">

            {/* ── LEFT: Sticky image gallery — 56% ── */}
            <div className="sticky top-[80px]" style={{ width: "56%", flexShrink: 0 }}>
              <div className="flex gap-4">
                {/* Vertical thumbnails */}
                {product.images.length > 1 && (
                  <div className="flex flex-col gap-2" style={{ width: "60px", flexShrink: 0 }}>
                    {product.images.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImage(i)}
                        className="relative rounded-lg overflow-hidden transition-all"
                        style={{
                          width: "60px", height: "76px",
                          border: `2px solid ${i === activeImage ? "#0b0b14" : "transparent"}`,
                          background: "#ede9e1",
                          opacity: i === activeImage ? 1 : 0.5,
                          flexShrink: 0,
                        }}>
                        {isVideo(img.url) ? (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#1a1a2e" }}>
                            <span className="material-symbols-outlined text-[22px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                          </div>
                        ) : (
                          <Image src={img.url} alt={img.altText ?? ""} fill className="object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main image */}
                <div className="flex-1 relative rounded-xl img-zoom"
                  style={{ aspectRatio: "4/5", background: "#ede9e1" }}>
                  {product.images[activeImage] ? (
                    isVideo(product.images[activeImage].url) ? (
                      <video
                        src={product.images[activeImage].url}
                        autoPlay muted loop playsInline
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Image
                        src={product.images[activeImage].url}
                        alt={product.images[activeImage].altText ?? product.name}
                        fill className="object-cover rounded-xl"
                        priority
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                      <span className="material-symbols-outlined text-7xl" style={{ color: "#c8c6c5" }}>checkroom</span>
                    </div>
                  )}

                  {/* Sale badge */}
                  {hasDiscount && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                        style={{ background: "#ba1a1a", color: "white" }}>
                        -{discountPct}% OFF
                      </span>
                    </div>
                  )}

                  {/* Wishlist + Share */}
                  <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                    <button
                      onClick={toggleWishlist}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: wishlisted ? "rgba(186,26,26,0.1)" : "rgba(255,255,255,0.9)",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 2px 8px rgba(11,11,20,0.12)",
                      }}>
                      <span className="material-symbols-outlined text-[20px]"
                        style={{ color: wishlisted ? "#ba1a1a" : "#444748", fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}>
                        favorite
                      </span>
                    </button>
                    <button
                      onClick={shareProduct}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: "rgba(255,255,255,0.9)",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 2px 8px rgba(11,11,20,0.12)",
                      }}>
                      <span className="material-symbols-outlined text-[18px]" style={{ color: "#444748" }}>
                        {copied ? "check" : "share"}
                      </span>
                    </button>
                  </div>

                  {/* Image counter */}
                  {product.images.length > 1 && (
                    <div className="absolute bottom-4 right-4 z-10 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{ background: "rgba(11,11,20,0.5)", color: "white", backdropFilter: "blur(4px)" }}>
                      {activeImage + 1} / {product.images.length}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT: Product info — 44% ── */}
            <div className="flex-1 min-w-0 pt-2">

              {/* Category */}
              {product.category && (
                <p className="pd-fade-up text-[10px] font-bold uppercase tracking-[0.28em] mb-3"
                  style={{ color: "#c9a84c", animationDelay: "0s" }}>
                  {product.category.name}
                </p>
              )}

              {/* Product name */}
              <h1
                className="pd-fade-up font-['Playfair_Display'] font-bold leading-tight mb-4"
                style={{ fontSize: "clamp(2rem,3vw,3.25rem)", color: "#0b0b14", animationDelay: "0.06s" }}>
                {product.name}
              </h1>

              {/* Rating */}
              {rating > 0 && (
                <div className="pd-fade-up flex items-center gap-3 mb-5" style={{ animationDelay: "0.1s" }}>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-[16px]"
                        style={{ color: i < Math.round(rating) ? "#c9a84c" : "#e2e2e2" }}>★</span>
                    ))}
                  </div>
                  <span className="text-sm" style={{ color: "rgba(11,11,20,0.5)" }}>
                    {rating.toFixed(1)} ({product.reviews.length} review{product.reviews.length !== 1 ? "s" : ""})
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="pd-fade-up flex items-baseline gap-3 mb-5" style={{ animationDelay: "0.13s" }}>
                <span className="font-['Playfair_Display'] text-[2rem] font-bold" style={{ color: "#0b0b14" }}>
                  ৳{finalPrice.toLocaleString()}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-lg line-through" style={{ color: "rgba(11,11,20,0.35)" }}>
                      ৳{Number(product.compareAtPrice).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(186,26,26,0.1)", color: "#ba1a1a" }}>
                      {discountPct}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="pd-fade-up mb-6" style={{ height: "1px", background: "#e8e4dc", animationDelay: "0.15s" }} />

              {/* Color selector */}
              {colors.length > 0 && (
                <div ref={colorRef} className={`pd-fade-up mb-6 ${colorError ? "shake" : ""}`}
                  style={{ animationDelay: "0.17s" }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
                    style={{ color: colorError ? "#ba1a1a" : "rgba(11,11,20,0.45)" }}>
                    Colour
                    {colorError ? <span className="normal-case tracking-normal font-semibold"> — Please select</span>
                      : selectedColor ? <span className="normal-case tracking-normal font-normal" style={{ color: "#0b0b14" }}> · {selectedColor}</span>
                      : null}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {colors.map((c) => (
                      <button key={c}
                        onClick={() => { setSelectedColor(c === selectedColor ? null : c); setColorError(false); }}
                        title={c}
                        className="rounded-full transition-all flex items-center justify-center"
                        style={{
                          width: "40px", height: "40px",
                          backgroundColor: c.toLowerCase() === "white" ? "#f9f9f9" : c.toLowerCase() === "beige" ? "#d4b896" : c.toLowerCase(),
                          boxShadow: selectedColor === c
                            ? "0 0 0 2px #faf7f0, 0 0 0 4px #0b0b14"
                            : colorError ? "0 0 0 2px rgba(186,26,26,0.4)" : "0 0 0 1px rgba(11,11,20,0.15)",
                        }}>
                        {selectedColor === c && (
                          <span className="material-symbols-outlined text-[14px]"
                            style={{ color: ["white","beige","yellow","ivory"].includes(c.toLowerCase()) ? "#0b0b14" : "white" }}>
                            check
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size selector */}
              {sizes.length > 0 && (
                <div ref={sizeRef} className={`pd-fade-up mb-6 ${sizeError ? "shake" : ""}`}
                  style={{ animationDelay: "0.2s" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: sizeError ? "#ba1a1a" : "rgba(11,11,20,0.45)" }}>
                      Size
                      {sizeError && <span className="normal-case tracking-normal font-semibold"> — Please select</span>}
                    </p>
                    <button onClick={openSizeChart}
                      className="text-xs font-semibold transition-colors hover:opacity-70"
                      style={{ color: "#c9a84c" }}>
                      Size Chart →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => {
                      const v = product.variants.find((vv) => vv.size === s && (!selectedColor || vv.color === selectedColor));
                      const oos = v ? v.stockQuantity === 0 : false;
                      return (
                        <button key={s}
                          onClick={() => { if (!oos) { setSelectedSize(s === selectedSize ? null : s); setSizeError(false); } }}
                          disabled={oos}
                          className="size-pill px-5 py-2.5 text-sm font-semibold rounded-lg"
                          style={{
                            background: selectedSize === s ? "#0b0b14" : "white",
                            color: selectedSize === s ? "#faf7f0" : oos ? "rgba(11,11,20,0.2)" : "#0b0b14",
                            border: `1.5px solid ${selectedSize === s ? "#0b0b14" : oos ? "rgba(11,11,20,0.08)" : sizeError ? "rgba(186,26,26,0.4)" : "rgba(11,11,20,0.15)"}`,
                            textDecoration: oos ? "line-through" : "none",
                            cursor: oos ? "not-allowed" : "pointer",
                          }}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scarcity indicator */}
              {lowStock && (
                <p className="text-[12px] font-semibold mb-1" style={{ color: "#ba1a1a" }}>
                  ⚠ Only {lowStock} left in this size — order soon
                </p>
              )}

              {/* Material */}
              <div className="flex items-center gap-2 mb-5 px-3.5 py-2.5 rounded-xl"
                style={{ background: "rgba(11,11,20,0.03)", border: "1px solid rgba(11,11,20,0.07)" }}>
                <span className="material-symbols-outlined text-[16px]" style={{ color: "#3d2b7a" }}>texture</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "rgba(11,11,20,0.4)" }}>Material</span>
                <span className="text-[13px] font-semibold ml-auto" style={{ color: "#0b0b14" }}>{product.material || "100% Cotton"}</span>
              </div>

              {/* Quantity */}
              <div className="pd-fade-up mb-6" style={{ animationDelay: "0.22s" }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
                  style={{ color: "rgba(11,11,20,0.45)" }}>Quantity</p>
                <div className="flex items-center rounded-xl overflow-hidden w-fit"
                  style={{ border: "1.5px solid rgba(11,11,20,0.15)", background: "white" }}>
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    style={{ color: "#0b0b14" }}>
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <span className="w-12 text-center text-sm font-bold" style={{ color: "#0b0b14" }}>{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)}
                    className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    style={{ color: "#0b0b14" }}>
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>

              {/* ATC + Buy Now */}
              <div className="pd-fade-up space-y-3 mb-6" style={{ animationDelay: "0.25s" }}>
                <button
                  ref={atcRef}
                  onClick={() => addToCart()}
                  disabled={!inStock}
                  className="atc-btn w-full py-4 text-sm font-bold uppercase tracking-widest rounded-xl"
                  style={{
                    background: addedToCart ? "#16a34a" : inStock ? "#0b0b14" : "rgba(11,11,20,0.1)",
                    color: addedToCart ? "white" : inStock ? "#faf7f0" : "rgba(11,11,20,0.3)",
                    cursor: inStock ? "pointer" : "not-allowed",
                  }}>
                  {addedToCart ? "✓ Added to Bag" : inStock ? "Add to Bag" : "Out of Stock"}
                </button>
                <button
                  onClick={buyNow}
                  disabled={!inStock}
                  className="w-full py-4 text-sm font-bold uppercase tracking-widest rounded-xl transition-all hover:bg-[#0b0b14] hover:text-[#faf7f0] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    border: "2px solid #0b0b14",
                    color: "#0b0b14",
                    background: "transparent",
                  }}>
                  Buy Now
                </button>
                {!inStock && <NotifyMeButton productId={product.id} variantId={activeVariant?.id} size={selectedSize} />}
              </div>

              {/* Trust badges */}
              <div className="pd-fade-up grid grid-cols-3 gap-3 mb-6" style={{ animationDelay: "0.28s" }}>
                {[
                  { icon: "local_shipping", title: "Free Shipping", sub: "On orders above ৳2,000" },
                  { icon: "autorenew", title: "Easy Returns", sub: "30-day return policy" },
                  { icon: "verified_user", title: "Authentic", sub: "Quality guaranteed" },
                ].map((t) => (
                  <div key={t.icon} className="flex flex-col items-center text-center gap-2 px-2 py-3 rounded-xl"
                    style={{ background: "rgba(61,43,122,0.04)", border: "1px solid rgba(61,43,122,0.08)" }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(61,43,122,0.1)" }}>
                      <span className="material-symbols-outlined text-[18px]" style={{ color: "#3d2b7a" }}>{t.icon}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: "#0b0b14" }}>{t.title}</p>
                      <p className="text-[10px]" style={{ color: "rgba(11,11,20,0.45)" }}>{t.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* ── Below fold: Tabs ── */}
          <div ref={tabsRef} className="mt-24">
            {/* Tab bar */}
            <div className="relative" style={{ borderBottom: "1px solid #e8e4dc" }}>
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="tab-btn px-6 py-4 text-sm font-semibold relative"
                    style={{
                      color: activeTab === tab.key ? "#0b0b14" : "rgba(11,11,20,0.4)",
                      minWidth: `${tabWidthPct}%`,
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* Sliding indicator */}
              <div
                className="absolute bottom-0 h-[2px] rounded-full"
                style={{
                  background: "#0b0b14",
                  width: `${tabWidthPct}%`,
                  left: `${tabIdx * tabWidthPct}%`,
                  transition: "left 0.3s cubic-bezier(.4,0,.2,1)",
                }}
              />
            </div>

            {/* Tab content */}
            <div className="py-10 max-w-4xl">
              {activeTab === "description" && (
                <div className="pd-fade-in space-y-6 text-[#5a5358] leading-relaxed">
                  <p className="text-base">{product.description ?? "Premium quality garment with exceptional finish and comfort."}</p>
                  {product.material && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: "rgba(11,11,20,0.4)" }}>Material</p>
                      <p>{product.material}</p>
                    </div>
                  )}
                  {product.careInstructions && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: "rgba(11,11,20,0.4)" }}>Care Instructions</p>
                      <p>{product.careInstructions}</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "reviews" && (
                <div className="pd-fade-in">
                  <ReviewsTab slug={product.slug} initialReviews={product.reviews} initialAvg={product.averageRating ?? 0} />
                </div>
              )}
            </div>
          </div>

          {/* Related products */}
          {related.length > 0 && (
            <div className="mt-8 pt-16" style={{ borderTop: "1px solid #e8e4dc" }}>
              <h2 className="font-['Playfair_Display'] text-2xl font-bold mb-8" style={{ color: "#0b0b14" }}>
                You might also like
              </h2>
              <div className="grid grid-cols-4 gap-6">
                {related.map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`} className="group">
                    <div className="relative rounded-xl overflow-hidden mb-3 img-zoom"
                      style={{ aspectRatio: "3/4", background: "#ede9e1" }}>
                      {p.images[0] ? (
                        <Image src={p.images[0].url} alt={p.name} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl" style={{ color: "#c4c7c7" }}>checkroom</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold mb-0.5 transition-colors group-hover:text-[#5951b4]"
                      style={{ color: "#0b0b14" }}>{p.name}</p>
                    <p className="text-sm font-bold" style={{ color: "#3d2b7a" }}>৳{Number(p.price).toLocaleString()}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <RecentlyViewed excludeId={product.id} />

      {/* ── Size chart modal (PC + mobile) ───────────────────── */}
      {sizeModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          onClick={() => setSizeModalOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(11,11,20,0.6)", backdropFilter: "blur(4px)" }} />
          <div className="share-panel relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#faf7f0", border: "1px solid rgba(11,11,20,0.08)", boxShadow: "0 24px 60px rgba(11,11,20,0.4)" }}>
            <div className="sticky top-0 flex items-center justify-between px-5 py-4"
              style={{ background: "#faf7f0", borderBottom: "1px solid #e8e4dc" }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]" style={{ color: "#c9a84c" }}>straighten</span>
                <h3 className="font-['Playfair_Display'] text-lg font-bold" style={{ color: "#0b0b14" }}>Size Guide</h3>
              </div>
              <button onClick={() => setSizeModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ color: "rgba(11,11,20,0.5)" }} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5">
              <p className="text-[13px] mb-4" style={{ color: "rgba(11,11,20,0.55)" }}>
                All measurements are in inches. For the best fit, measure yourself and compare to the chart below.
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e8e4dc" }}>
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr style={{ background: "#f3f0e8" }}>
                      {["Size", "Chest", "Length", "Shoulder"].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em]"
                          style={{ color: "rgba(11,11,20,0.45)", borderBottom: "1px solid #e8e4dc" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeChartRows.map((row, i) => (
                      <tr key={row.size} style={{ background: i % 2 === 0 ? "white" : "rgba(243,240,232,0.4)" }}>
                        <td className="px-3 py-3 font-bold" style={{ color: "#0b0b14", borderBottom: "1px solid rgba(11,11,20,0.05)" }}>{row.size}</td>
                        <td className="px-3 py-3" style={{ color: "#5a5358", borderBottom: "1px solid rgba(11,11,20,0.05)" }}>{row.chest}</td>
                        <td className="px-3 py-3" style={{ color: "#5a5358", borderBottom: "1px solid rgba(11,11,20,0.05)" }}>{row.length}</td>
                        <td className="px-3 py-3" style={{ color: "#5a5358", borderBottom: "1px solid rgba(11,11,20,0.05)" }}>{row.shoulder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

/* ─── Reviews Tab ──────────────────────────────────────────── */
interface LiveReview {
  id: string; rating: number; title: string | null; body: string;
  helpfulCount: number; createdAt: string; user: { name: string } | null;
  photos?: string[];
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((s) => (
        <button key={s} type="button"
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className={`text-2xl transition-colors ${s <= (hover || value) ? "text-yellow-400" : "text-[#c4c7c7]"}`}>★</button>
      ))}
    </div>
  );
}

function ReviewsTab({ slug, initialReviews, initialAvg }: { slug: string; initialReviews: LiveReview[]; initialAvg: number }) {
  const [reviews, setReviews]   = useState<LiveReview[]>(initialReviews);
  const [avg, setAvg]           = useState(initialAvg);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating]     = useState(5);
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");
  const [success, setSuccess]       = useState(false);
  const [loggedIn, setLoggedIn]     = useState(false);
  const [photoUrls, setPhotoUrls]   = useState("");

  useEffect(() => { setLoggedIn(!!localStorage.getItem("ag_authed")); }, []);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/products/${slug}/reviews`);
    if (res.ok) { const d = await res.json(); setReviews(d.reviews); setAvg(d.avg); }
  }, [slug]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setFormError("");
    const token = localStorage.getItem("ag_authed");
    const photos = photoUrls.split(",").map(u => u.trim()).filter(Boolean);
    const res = await fetch(`/api/products/${slug}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rating, title, body, photos }),
    });
    const data = await res.json();
    if (res.ok) { setSuccess(true); setShowForm(false); setTitle(""); setBody(""); setRating(5); setPhotoUrls(""); refresh(); }
    else { setFormError(data.error ?? "Failed to submit review."); }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      {reviews.length > 0 && (
        <div className="flex items-center gap-4 pb-5"
          style={{ borderBottom: "1px solid rgba(18,16,58,0.08)" }}>
          <div className="text-center">
            <p className="font-['Playfair_Display'] text-[2.5rem] font-bold leading-none" style={{ color: "#12103a" }}>{avg.toFixed(1)}</p>
            <div className="flex justify-center mt-1 gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-[14px]" style={{ color: i < Math.round(avg) ? "#c9a84c" : "#e2e2e2" }}>★</span>
              ))}
            </div>
            <p className="text-[11px] mt-1" style={{ color: "rgba(18,16,58,0.4)" }}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}

      {!showForm && !success && (
        loggedIn ? (
          <button onClick={() => setShowForm(true)}
            className="px-6 py-3 rounded-xl text-[13px] font-bold"
            style={{ background: "#12103a", color: "#faf7f0" }}>
            Write a Review
          </button>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(`/products/${slug}`)}`}
            className="inline-block px-6 py-3 rounded-xl text-[13px] font-bold"
            style={{ background: "#12103a", color: "#faf7f0" }}>
            Sign in to Review
          </Link>
        )
      )}

      {success && (
        <div className="px-4 py-3 rounded-xl text-[13px]"
          style={{ background: "rgba(22,163,74,0.08)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}>
          Thank you! Your review has been submitted.
        </div>
      )}

      {showForm && (
        <form onSubmit={submitReview} className="space-y-4 p-4 rounded-2xl"
          style={{ background: "white", border: "1px solid rgba(18,16,58,0.08)" }}>
          <h3 className="font-['Playfair_Display'] text-[1.1rem] font-semibold" style={{ color: "#12103a" }}>Write a Review</h3>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: "rgba(18,16,58,0.5)" }}>Your Rating</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: "rgba(18,16,58,0.5)" }}>Title (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-[14px] outline-none"
              style={{ border: "1px solid rgba(18,16,58,0.12)", background: "#faf7f0", color: "#12103a" }}
              placeholder="Summarise your experience" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: "rgba(18,16,58,0.5)" }}>Review</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              rows={4} required
              className="w-full rounded-xl px-4 py-3 text-[14px] outline-none resize-none"
              style={{ border: "1px solid rgba(18,16,58,0.12)", background: "#faf7f0", color: "#12103a" }}
              placeholder="Fit, quality, material…" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: "rgba(18,16,58,0.5)" }}>Add photos <span className="normal-case tracking-normal font-normal" style={{ color: "rgba(18,16,58,0.35)" }}>(optional)</span></label>
            <textarea value={photoUrls} onChange={(e) => setPhotoUrls(e.target.value)}
              rows={2}
              className="w-full rounded-xl px-4 py-3 text-[14px] outline-none resize-none"
              style={{ border: "1px solid rgba(18,16,58,0.12)", background: "#faf7f0", color: "#12103a" }}
              placeholder="Paste image URLs separated by commas (Cloudinary, Imgur, etc.)" />
            <p className="text-[11px] mt-1" style={{ color: "rgba(18,16,58,0.35)" }}>Paste one or more image URLs, separated by commas</p>
          </div>
          {formError && <p className="text-[13px]" style={{ color: "#ba1a1a" }}>{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-xl text-[13px] font-bold disabled:opacity-50"
              style={{ background: "#12103a", color: "#faf7f0" }}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-3 rounded-xl text-[13px] font-semibold"
              style={{ border: "1px solid rgba(18,16,58,0.12)", color: "#5a5358" }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[14px]" style={{ color: "rgba(18,16,58,0.4)" }}>No reviews yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map((r) => (
            <div key={r.id} className="pb-5" style={{ borderBottom: "1px solid rgba(18,16,58,0.07)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
                    style={{ background: "rgba(61,43,122,0.1)", color: "#3d2b7a" }}>
                    {(r.user?.name ?? "V")[0].toUpperCase()}
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: "#12103a" }}>{r.user?.name ?? "Verified Buyer"}</span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-[12px]" style={{ color: i < r.rating ? "#c9a84c" : "#e2e2e2" }}>★</span>
                  ))}
                </div>
              </div>
              {r.title && <p className="text-[13px] font-semibold mb-1" style={{ color: "#12103a" }}>{r.title}</p>}
              <p className="text-[13px] leading-relaxed" style={{ color: "#5a5358" }}>{r.body}</p>
              {r.photos && r.photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {r.photos.map((photo, pi) => (
                    <a key={pi} href={photo} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 rounded-xl overflow-hidden block"
                      style={{ height: "80px", width: "80px", background: "#ede8e0" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt={`Review photo ${pi + 1}`} width={80} height={80} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <p className="text-[11px] mt-2" style={{ color: "rgba(18,16,58,0.3)" }}>
                {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Notify Me (Waitlist) Button ─────────────────────────── */
function NotifyMeButton({ productId, variantId, size }: { productId: string; variantId?: string; size?: string | null }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function notify() {
    const token = localStorage.getItem("ag_authed");
    if (!token) { window.location.href = "/login"; return; }
    setLoading(true);
    await fetch("/api/account/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId, variantId, size }),
    });
    setDone(true);
    setLoading(false);
  }

  if (done) return (
    <div className="flex items-center gap-2 mt-3 px-4 py-3 rounded-xl" style={{ background: "#d4f0d9" }}>
      <span className="material-symbols-outlined text-base text-[#1a7f37]">check_circle</span>
      <p className="text-sm font-semibold text-[#1a7f37]">We&apos;ll notify you when this is back in stock.</p>
    </div>
  );

  return (
    <button onClick={notify} disabled={loading}
      className="w-full mt-3 h-12 rounded-xl text-[13px] font-bold border-2 flex items-center justify-center gap-2 transition-all"
      style={{ borderColor: "#c9a84c", color: "#c9a84c", background: "rgba(201,168,76,0.05)" }}>
      <span className="material-symbols-outlined text-[18px]">notifications</span>
      {loading ? "Saving…" : "Notify Me When Back in Stock"}
    </button>
  );
}
