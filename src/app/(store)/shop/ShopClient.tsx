"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";

interface Product {
  id: string; name: string; slug: string; price: number; compareAtPrice?: number;
  images: { url: string }[];
  averageRating?: number;
  _count?: { reviews: number };
}
interface Filters { colors: string[]; sizes: string[]; priceRange: { min: number; max: number }; }
interface Category { id: string; name: string; slug: string; }

const SORTS = [
  { value: "newest",     label: "Newest First",       icon: "schedule" },
  { value: "price_asc",  label: "Price: Low → High",  icon: "arrow_upward" },
  { value: "price_desc", label: "Price: High → Low",  icon: "arrow_downward" },
  { value: "popular",    label: "Most Popular",        icon: "local_fire_department" },
  { value: "rating",     label: "Top Rated",           icon: "star" },
];

export default function ShopClient() {
  const sp     = useSearchParams();
  const router = useRouter();

  const [products, setProducts]         = useState<Product[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [filtersData, setFiltersData]   = useState<Filters>({ colors: [], sizes: [], priceRange: { min: 0, max: 5000 } });
  const [categories, setCategories]     = useState<Category[]>([]);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [sortOpen, setSortOpen]         = useState(false);
  const [page, setPage]                 = useState(1);
  const [allProducts, setAllProducts]   = useState<Product[]>([]);

  const q              = sp.get("q") ?? "";
  const sort           = sp.get("sort") ?? "newest";
  const categorySlug   = sp.get("category") ?? "";
  const selectedColors = sp.getAll("color");
  const selectedSizes  = sp.getAll("size");
  const minPrice       = sp.get("minPrice") ?? "";
  const maxPrice       = sp.get("maxPrice") ?? "";

  const [wishlist, setWishlist]           = useState<Set<string>>(new Set());
  const [minPriceLocal, setMinPriceLocal] = useState(minPrice);
  const [maxPriceLocal, setMaxPriceLocal] = useState(maxPrice);
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  function updateParam(key: string, value: string, multi = false) {
    const params = new URLSearchParams(sp.toString());
    if (multi) {
      const existing = params.getAll(key);
      if (existing.includes(value)) {
        params.delete(key);
        existing.filter((v) => v !== value).forEach((v) => params.append(key, v));
      } else {
        params.append(key, value);
      }
    } else {
      if (value) params.set(key, value); else params.delete(key);
    }
    params.delete("page");
    router.push(`/shop?${params.toString()}`);
    setPage(1);
    setAllProducts([]);
  }

  function clearFilters() {
    router.push("/shop");
    setPage(1);
    setAllProducts([]);
  }

  useEffect(() => {
    fetch("/api/products/filters").then((r) => r.json()).then((d) => setFiltersData(d));
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? []));
    const token = localStorage.getItem("userToken");
    if (token) {
      fetch("/api/account/wishlist", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          const ids = new Set<string>((d.items ?? []).map((i: { product: { id: string } }) => i.product.id));
          setWishlist(ids);
        })
        .catch(() => {});
    }
  }, []);

  function toggleWishlist(e: React.MouseEvent, productId: string) {
    e.preventDefault(); e.stopPropagation();
    const token = localStorage.getItem("userToken");
    if (!token) { window.location.href = "/login"; return; }
    const wasWishlisted = wishlist.has(productId);
    setWishlist((prev) => { const next = new Set(prev); wasWishlisted ? next.delete(productId) : next.add(productId); return next; });
    fetch("/api/account/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId }),
    }).catch(() => {
      setWishlist((prev) => { const next = new Set(prev); wasWishlisted ? next.add(productId) : next.delete(productId); return next; });
    });
  }

  function updatePriceParam(key: "minPrice" | "maxPrice", value: string) {
    if (key === "minPrice") setMinPriceLocal(value); else setMaxPriceLocal(value);
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(() => updateParam(key, value), 600);
  }

  const fetchProducts = useCallback(async (append = false) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "12", sort });
    if (q) params.set("q", q);
    if (categorySlug) params.set("category", categorySlug);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    selectedColors.forEach((c) => params.append("colors", c));
    selectedSizes.forEach((s) => params.append("sizes", s));
    const res  = await fetch(`/api/products?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    const fetched: Product[] = data.products ?? [];
    setTotal(data.pagination?.total ?? 0);
    if (append) setAllProducts((prev) => [...prev, ...fetched]);
    else { setAllProducts(fetched); setProducts(fetched); }
    setProducts(fetched);
    setLoading(false);
  }, [page, q, sort, categorySlug, minPrice, maxPrice, selectedColors.join(), selectedSizes.join()]);

  useEffect(() => { fetchProducts(page > 1); }, [fetchProducts]);

  const totalPages        = Math.ceil(total / 12);
  const hasActiveFilters  = !!(categorySlug || selectedColors.length || selectedSizes.length || minPrice || maxPrice);
  const activeFilterCount = (categorySlug ? 1 : 0) + selectedColors.length + selectedSizes.length + (minPrice || maxPrice ? 1 : 0);

  /* ── Desktop Sidebar ── */
  const Sidebar = () => (
    <aside className="space-y-8">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#12103a" }}>Category</h3>
        <div className="space-y-2">
          <button onClick={() => updateParam("category", "")}
            className={`block w-full text-left text-sm transition-colors ${!categorySlug ? "font-bold text-black" : "text-[#5a5358] hover:text-black"}`}>
            All Products <span className="text-[#747878]">({total})</span>
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => updateParam("category", c.slug)}
              className={`block w-full text-left text-sm transition-colors ${categorySlug === c.slug ? "font-bold text-black" : "text-[#5a5358] hover:text-black"}`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      {filtersData.sizes.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#12103a" }}>Size</h3>
          <div className="grid grid-cols-4 gap-2">
            {filtersData.sizes.map((s) => (
              <button key={s} onClick={() => updateParam("size", s, true)}
                className={`py-2 text-xs font-semibold border transition-colors ${selectedSizes.includes(s) ? "bg-[#12103a] text-white border-[#12103a]" : "border-[#c4c7c7] text-[#5a5358] hover:border-[#12103a]"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {filtersData.colors.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#12103a" }}>Color</h3>
          <div className="flex flex-wrap gap-3">
            {filtersData.colors.map((c) => (
              <button key={c} onClick={() => updateParam("color", c, true)} title={c}
                className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColors.includes(c) ? "border-[#12103a] scale-110" : "border-transparent hover:border-[#c4c7c7]"}`}
                style={{ backgroundColor: c.toLowerCase() === "white" ? "#f9f9f9" : c.toLowerCase() === "beige" ? "#d4b896" : c.toLowerCase() }} />
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#12103a" }}>Price</h3>
        <div className="flex gap-3 items-center">
          <input type="number" placeholder="Min" value={minPriceLocal}
            onChange={(e) => updatePriceParam("minPrice", e.target.value)}
            className="w-full border border-[#c4c7c7] px-3 py-2 text-sm outline-none focus:border-[#12103a]" />
          <span className="text-[#747878]">—</span>
          <input type="number" placeholder="Max" value={maxPriceLocal}
            onChange={(e) => updatePriceParam("maxPrice", e.target.value)}
            className="w-full border border-[#c4c7c7] px-3 py-2 text-sm outline-none focus:border-[#12103a]" />
        </div>
      </div>
      {hasActiveFilters && (
        <button onClick={clearFilters} className="text-xs font-semibold uppercase tracking-widest hover:underline" style={{ color: "#ba1a1a" }}>
          Clear all filters
        </button>
      )}
    </aside>
  );

  return (
    <div style={{ background: "#f5f4f1", minHeight: "100vh", fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* ═══════════════════════════════════════════════════════
          MOBILE LAYOUT
      ═══════════════════════════════════════════════════════ */}
      <div className="md:hidden">

        {/* ── Sticky bar: title + categories + filter/sort buttons ── */}
        <div className="sticky z-20 px-3 pt-2 pb-2"
          style={{
            top: 64,
            background: "rgba(245,244,241,0.96)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(18,16,58,0.07)",
          }}>
          <div className="flex items-baseline gap-2 mb-1.5">
            <h1 className="text-[15px] font-bold" style={{ color: "#12103a" }}>
              {q ? `"${q}"` : categorySlug ? (categories.find(c => c.slug === categorySlug)?.name ?? "Shop") : "All Products"}
            </h1>
            {!loading && <span className="text-[11px]" style={{ color: "rgba(18,16,58,0.3)" }}>{total}</span>}
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <button onClick={() => updateParam("category", "")}
              className="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: !categorySlug ? "#12103a" : "white", color: !categorySlug ? "#faf7f0" : "#5a5358", border: `1px solid ${!categorySlug ? "#12103a" : "rgba(18,16,58,0.1)"}` }}>
              All
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => updateParam("category", c.slug)}
                className="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: categorySlug === c.slug ? "#12103a" : "white", color: categorySlug === c.slug ? "#faf7f0" : "#5a5358", border: `1px solid ${categorySlug === c.slug ? "#12103a" : "rgba(18,16,58,0.1)"}` }}>
                {c.name}
              </button>
            ))}
          </div>

          {/* Filter + Sort buttons */}
          <div className="flex gap-2 mt-1.5">
            <button onClick={() => setFilterOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-1 justify-center relative"
              style={{ background: hasActiveFilters ? "#12103a" : "white", color: hasActiveFilters ? "#faf7f0" : "#12103a", border: `1px solid ${hasActiveFilters ? "#12103a" : "rgba(18,16,58,0.1)"}` }}>
              <span className="material-symbols-outlined text-[15px]">tune</span>
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: "#c9a84c", color: "#0b0b14" }}>{activeFilterCount}</span>
              )}
            </button>
            <button onClick={() => setSortOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-1 justify-center"
              style={{ background: "white", color: "#12103a", border: "1px solid rgba(18,16,58,0.1)" }}>
              <span className="material-symbols-outlined text-[15px]">swap_vert</span>
              {SORTS.find(s => s.value === sort)?.label.replace(" First","").split(":")[0] ?? "Sort"}
            </button>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              {selectedSizes.map(s => (
                <button key={s} onClick={() => updateParam("size", s, true)}
                  className="shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: "rgba(61,43,122,0.08)", color: "#3d2b7a", border: "1px solid rgba(61,43,122,0.15)" }}>
                  {s} <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              ))}
              {selectedColors.map(c => (
                <button key={c} onClick={() => updateParam("color", c, true)}
                  className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: "rgba(61,43,122,0.08)", color: "#3d2b7a", border: "1px solid rgba(61,43,122,0.15)" }}>
                  <span className="w-2 h-2 rounded-full inline-block shrink-0"
                    style={{ background: c.toLowerCase() === "white" ? "#ddd" : c.toLowerCase() === "beige" ? "#d4b896" : c.toLowerCase() }} />
                  {c} <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              ))}
              {(minPrice || maxPrice) && (
                <button onClick={() => { updateParam("minPrice", ""); updateParam("maxPrice", ""); }}
                  className="shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: "rgba(61,43,122,0.08)", color: "#3d2b7a", border: "1px solid rgba(61,43,122,0.15)" }}>
                  ৳{minPrice||"0"}–{maxPrice||"∞"} <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              )}
              <button onClick={clearFilters} className="shrink-0 px-2 py-0.5 text-[10px] font-semibold" style={{ color: "#ba1a1a" }}>Clear all</button>
            </div>
          )}
        </div>

        {/* ── Product grid ── */}
        <div className="px-2 pt-3 pb-28">
          {loading && allProducts.length === 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ background: "white" }}>
                  <div className="aspect-[3/4] animate-pulse" style={{ background: "#ede8e0" }} />
                  <div className="p-2 space-y-1.5">
                    <div className="h-2.5 rounded-full animate-pulse" style={{ background: "#e8e8e8", width: "78%" }} />
                    <div className="h-2.5 rounded-full animate-pulse" style={{ background: "#e8e8e8", width: "42%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : allProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="material-symbols-outlined text-3xl" style={{ color: "#c4c7c7" }}>search_off</span>
              <p className="text-[13px] font-medium" style={{ color: "#9a9898" }}>Nothing found</p>
              <button onClick={clearFilters}
                className="px-5 py-2 rounded-full text-[12px] font-bold active:scale-95 transition-transform"
                style={{ background: "#12103a", color: "#faf7f0" }}>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {allProducts.map((p, i) => (
                  <MobileProductCard key={`${p.id}-${i}`} product={p} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                ))}
                {loading && page > 1 && Array.from({ length: 2 }).map((_, i) => (
                  <div key={`sk-${i}`} className="rounded-xl overflow-hidden" style={{ background: "white" }}>
                    <div className="aspect-[3/4] animate-pulse" style={{ background: "#ede8e0" }} />
                    <div className="p-2 space-y-1.5">
                      <div className="h-2.5 rounded-full animate-pulse" style={{ background: "#e8e8e8", width: "75%" }} />
                      <div className="h-2.5 rounded-full animate-pulse" style={{ background: "#e8e8e8", width: "40%" }} />
                    </div>
                  </div>
                ))}
              </div>

              {page < totalPages && (
                <div className="mt-5 flex justify-center">
                  <button onClick={() => setPage((n) => n + 1)} disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[12px] font-bold transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: "#12103a", color: "#faf7f0" }}>
                    {loading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Load More <span className="opacity-40 font-normal">({total - allProducts.length})</span></>
                    )}
                  </button>
                </div>
              )}

              {page >= totalPages && allProducts.length > 0 && (
                <p className="text-center text-[10px] mt-6 pb-2" style={{ color: "rgba(18,16,58,0.25)" }}>
                  — {total} items —
                </p>
              )}
            </>
          )}
        </div>

        {/* ── FILTER MODAL ── */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 60,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 16px",
          pointerEvents: filterOpen ? "auto" : "none",
        }}>
          <div onClick={() => setFilterOpen(false)} style={{
            position: "absolute", inset: 0,
            background: "rgba(11,11,20,0.55)",
            opacity: filterOpen ? 1 : 0,
            transition: "opacity 0.2s ease",
          }} />
          <div style={{
            position: "relative", width: "100%", maxWidth: 400,
            background: "#faf7f0",
            borderRadius: 20,
            maxHeight: "80dvh",
            display: "flex", flexDirection: "column",
            opacity: filterOpen ? 1 : 0,
            transform: filterOpen ? "scale(1)" : "scale(0.95)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(18,16,58,0.07)" }}>
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-bold" style={{ color: "#12103a" }}>Filters</p>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "#c9a84c", color: "#0b0b14" }}>{activeFilterCount}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button onClick={() => { clearFilters(); setFilterOpen(false); }}
                    className="text-[12px] font-semibold" style={{ color: "#ba1a1a" }}>Clear all</button>
                )}
                <button onClick={() => setFilterOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(18,16,58,0.07)" }}>
                  <span className="material-symbols-outlined text-[16px]" style={{ color: "#12103a" }}>close</span>
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5" style={{ overscrollBehavior: "contain" }}>
              {filtersData.sizes.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: "#c9a84c" }}>Size</p>
                  <div className="flex flex-wrap gap-2">
                    {filtersData.sizes.map(s => (
                      <button key={s} onClick={() => updateParam("size", s, true)}
                        className="px-4 py-1.5 rounded-xl text-[12px] font-semibold active:scale-95 transition-transform"
                        style={{ background: selectedSizes.includes(s) ? "#12103a" : "white", color: selectedSizes.includes(s) ? "#faf7f0" : "#5a5358", border: `1px solid ${selectedSizes.includes(s) ? "#12103a" : "rgba(18,16,58,0.1)"}` }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {filtersData.colors.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: "#c9a84c" }}>Color</p>
                  <div className="flex flex-wrap gap-3">
                    {filtersData.colors.map(c => (
                      <button key={c} onClick={() => updateParam("color", c, true)} title={c}
                        className="flex flex-col items-center gap-1">
                        <span className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90 ${selectedColors.includes(c) ? "ring-2 ring-offset-2 ring-[#12103a]" : ""}`}
                          style={{ background: c.toLowerCase() === "white" ? "#f0f0f0" : c.toLowerCase() === "beige" ? "#d4b896" : c.toLowerCase(), border: "1px solid rgba(18,16,58,0.1)" }}>
                          {selectedColors.includes(c) && (
                            <span className="material-symbols-outlined text-[13px]"
                              style={{ color: ["white","beige","yellow"].includes(c.toLowerCase()) ? "#12103a" : "white" }}>check</span>
                          )}
                        </span>
                        <span className="text-[9px] font-medium" style={{ color: "#5a5358" }}>{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: "#c9a84c" }}>Price Range</p>
                <div className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: "#9a9898" }}>৳</span>
                    <input type="number" placeholder="Min" value={minPriceLocal}
                      onChange={e => updatePriceParam("minPrice", e.target.value)}
                      className="w-full rounded-xl pl-6 pr-3 py-2.5 text-[16px] outline-none"
                      style={{ background: "white", border: "1px solid rgba(18,16,58,0.12)", color: "#12103a" }} />
                  </div>
                  <span style={{ color: "#c4c7c7" }}>—</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: "#9a9898" }}>৳</span>
                    <input type="number" placeholder="Max" value={maxPriceLocal}
                      onChange={e => updatePriceParam("maxPrice", e.target.value)}
                      className="w-full rounded-xl pl-6 pr-3 py-2.5 text-[16px] outline-none"
                      style={{ background: "white", border: "1px solid rgba(18,16,58,0.12)", color: "#12103a" }} />
                  </div>
                </div>
              </div>
            </div>
            {/* CTA */}
            <div className="px-5 pt-3 pb-5 shrink-0" style={{ borderTop: "1px solid rgba(18,16,58,0.07)" }}>
              <button onClick={() => setFilterOpen(false)}
                className="w-full py-3 rounded-2xl text-[13px] font-bold active:scale-[0.98] transition-transform"
                style={{ background: "#12103a", color: "#faf7f0" }}>
                Show {total} Result{total !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>

        {/* ── SORT MODAL ── */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 60,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 16px",
          pointerEvents: sortOpen ? "auto" : "none",
        }}>
          <div onClick={() => setSortOpen(false)} style={{
            position: "absolute", inset: 0,
            background: "rgba(11,11,20,0.55)",
            opacity: sortOpen ? 1 : 0,
            transition: "opacity 0.2s ease",
          }} />
          <div style={{
            position: "relative", width: "100%", maxWidth: 400,
            background: "#faf7f0",
            borderRadius: 20,
            opacity: sortOpen ? 1 : 0,
            transform: sortOpen ? "scale(1)" : "scale(0.95)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3"
              style={{ borderBottom: "1px solid rgba(18,16,58,0.07)" }}>
              <p className="text-[15px] font-bold" style={{ color: "#12103a" }}>Sort by</p>
              <button onClick={() => setSortOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(18,16,58,0.07)" }}>
                <span className="material-symbols-outlined text-[16px]" style={{ color: "#12103a" }}>close</span>
              </button>
            </div>
            <div className="px-3 py-2 pb-4">
              {SORTS.map(s => (
                <button key={s.value}
                  onClick={() => { updateParam("sort", s.value); setSortOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-1 active:scale-[0.98] transition-transform"
                  style={{ background: sort === s.value ? "rgba(18,16,58,0.06)" : "transparent" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: sort === s.value ? "#12103a" : "rgba(18,16,58,0.05)" }}>
                    <span className="material-symbols-outlined text-[16px]"
                      style={{ color: sort === s.value ? "#c9a84c" : "#9a9898" }}>{s.icon}</span>
                  </div>
                  <span className="text-[13px] font-medium flex-1 text-left" style={{ color: "#12103a" }}>{s.label}</span>
                  {sort === s.value && (
                    <span className="material-symbols-outlined text-[18px]"
                      style={{ color: "#c9a84c", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ═══════════════════════════════════════════════════════ */}
      <div className="hidden md:block max-w-[1280px] mx-auto px-10 py-12">
        <div className="mb-8">
          <h1 className="font-['Playfair_Display'] text-4xl font-bold" style={{ color: "#12103a" }}>
            {q ? `Search: "${q}"` : categorySlug ? (categories.find((c) => c.slug === categorySlug)?.name ?? "Shop") : "Shop All"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#747878" }}>{total} products</p>
        </div>
        <div className="flex gap-10">
          <div className="w-52 flex-shrink-0"><Sidebar /></div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm" style={{ color: "#747878" }}>{total} products</p>
              <select value={sort} onChange={(e) => updateParam("sort", e.target.value)}
                className="border border-[#c4c7c7] px-4 py-2 text-sm outline-none bg-white">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {loading ? (
              <div className="grid grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-[14px] overflow-hidden bg-white">
                    <div className="aspect-[3/4]" style={{ background: "#e2e2e2" }} />
                    <div className="p-3 space-y-2">
                      <div className="h-4 rounded-full" style={{ background: "#e2e2e2", width: "75%" }} />
                      <div className="h-4 rounded-full" style={{ background: "#e2e2e2", width: "33%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <span className="material-symbols-outlined text-5xl" style={{ color: "#c4c7c7" }}>search_off</span>
                <p style={{ color: "#747878" }}>No products found.</p>
                <button onClick={clearFilters} className="text-sm font-semibold hover:underline" style={{ color: "#5951b4" }}>Clear filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-5">
                  {products.map((p) => <DesktopProductCard key={p.id} product={p} />)}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-12">
                    <button onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page === 1}
                      className="px-4 py-2 border border-[#c4c7c7] text-sm disabled:opacity-40 hover:bg-[#f4f3f3] transition-colors">Prev</button>
                    <span className="text-sm" style={{ color: "#444748" }}>Page {page} of {totalPages}</span>
                    <button onClick={() => setPage((n) => Math.min(totalPages, n + 1))} disabled={page === totalPages}
                      className="px-4 py-2 border border-[#c4c7c7] text-sm disabled:opacity-40 hover:bg-[#f4f3f3] transition-colors">Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── Mobile Product Card ─────────────────────────────────── */
function MobileProductCard({ product, wishlist, toggleWishlist }: {
  product: Product;
  wishlist: Set<string>;
  toggleWishlist: (e: React.MouseEvent, id: string) => void;
}) {
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice!)) * 100)
    : 0;
  const wishlisted = wishlist.has(product.id);

  return (
    <Link href={`/products/${product.slug}`}
      className="block active:scale-[0.97] transition-transform duration-150"
      style={{ borderRadius: 12, overflow: "hidden", background: "white" }}>
      <div className="relative" style={{ aspectRatio: "3/4", background: "#ede8e0" }}>
        {product.images?.[0] ? (
          <Image src={product.images[0].url} alt={product.name} fill className="object-cover"
            sizes="(max-width: 768px) 50vw, 200px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl" style={{ color: "#c8c6c5" }}>checkroom</span>
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "#ba1a1a", color: "white" }}>-{discountPct}%</span>
        )}
        <button
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{ background: "rgba(250,247,240,0.9)", backdropFilter: "blur(6px)" }}
          onClick={(e) => toggleWishlist(e, product.id)}>
          <span className="material-symbols-outlined text-[14px]"
            style={{ color: wishlisted ? "#ba1a1a" : "#12103a", fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}>
            favorite
          </span>
        </button>
      </div>
      <div className="px-2 pt-2 pb-2.5">
        <p className="text-[12px] font-semibold leading-tight line-clamp-1" style={{ color: "#12103a" }}>
          {product.name}
        </p>
        {product.averageRating && product.averageRating > 0 ? (
          <p className="text-[10px] mt-0.5" style={{ color: "#c9a84c" }}>
            {"★".repeat(Math.round(product.averageRating))}
            <span style={{ color: "#9a9898" }}> ({product._count?.reviews ?? 0})</span>
          </p>
        ) : null}
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-[13px] font-bold" style={{ color: "#12103a" }}>
            ৳{Number(product.price).toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-[10px] line-through" style={{ color: "#b0aeac" }}>
              ৳{Number(product.compareAtPrice).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Desktop Product Card ────────────────────────────────── */
function DesktopProductCard({ product }: { product: Product }) {
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  return (
    <Link href={`/products/${product.slug}`} className="group block bg-white" style={{ borderRadius: 14 }}>
      <div className="aspect-[3/4] relative overflow-hidden" style={{ borderRadius: "14px 14px 0 0", background: "#f4f3f3" }}>
        {product.images?.[0] ? (
          <Image src={product.images[0].url} alt={product.name} fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 768px) 300px, 100vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-[#c4c7c7]">checkroom</span>
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-3 left-3 text-white text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: "#ba1a1a" }}>SALE</span>
        )}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
          style={{ background: "rgba(11,11,20,0.85)", padding: "0.75rem 1rem" }}>
          <p className="text-center text-[11px] font-bold uppercase tracking-widest" style={{ color: "#c9a84c" }}>
            View Product
          </p>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-semibold text-[#1a1c1c] leading-snug line-clamp-2">{product.name}</p>
        {product.averageRating && product.averageRating > 0 ? (
          <div className="flex items-center gap-1">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-xs" style={{ color: i < Math.round(product.averageRating!) ? "#c9a84c" : "#e2e2e2" }}>★</span>
              ))}
            </div>
            <span className="text-[11px] text-[#747878]">({product._count?.reviews ?? 0})</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-black">৳{Number(product.price).toLocaleString()}</span>
          {hasDiscount && <span className="text-xs text-[#747878] line-through">৳{Number(product.compareAtPrice).toLocaleString()}</span>}
        </div>
      </div>
    </Link>
  );
}
