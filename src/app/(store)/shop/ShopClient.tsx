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
  { value: "newest",     label: "Newest First" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "popular",    label: "Most Popular" },
  { value: "rating",     label: "Top Rated" },
];

export default function ShopClient() {
  const sp = useSearchParams();
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
  const catRowRef                        = useRef<HTMLDivElement>(null);

  const q              = sp.get("q") ?? "";
  const sort           = sp.get("sort") ?? "newest";
  const categorySlug   = sp.get("category") ?? "";
  const selectedColors = sp.getAll("color");
  const selectedSizes  = sp.getAll("size");
  const minPrice       = sp.get("minPrice") ?? "";
  const maxPrice       = sp.get("maxPrice") ?? "";

  const [wishlist, setWishlist]          = useState<Set<string>>(new Set());
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
    // Load wishlist for logged-in users
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
    e.preventDefault();
    e.stopPropagation();
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
    if (key === "minPrice") setMinPriceLocal(value);
    else setMaxPriceLocal(value);
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
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    const fetched: Product[] = data.products ?? [];
    setTotal(data.pagination?.total ?? 0);
    if (append) {
      setAllProducts((prev) => [...prev, ...fetched]);
    } else {
      setAllProducts(fetched);
      setProducts(fetched);
    }
    setProducts(fetched);
    setLoading(false);
  }, [page, q, sort, categorySlug, minPrice, maxPrice, selectedColors.join(), selectedSizes.join()]);

  useEffect(() => { fetchProducts(page > 1); }, [fetchProducts]);

  const totalPages      = Math.ceil(total / 12);
  const hasActiveFilters = !!(categorySlug || selectedColors.length || selectedSizes.length || minPrice || maxPrice);
  const activeFilterCount = (categorySlug ? 1 : 0) + selectedColors.length + selectedSizes.length + (minPrice || maxPrice ? 1 : 0);
  const currentSortLabel = SORTS.find((s) => s.value === sort)?.label ?? "Newest First";

  /* ── Desktop Sidebar ───────────────────────────────── */
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
    <div style={{ background: "#faf7f0", minHeight: "100vh", fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* ═══════════════════════════════════════════════════════
          MOBILE LAYOUT
      ═══════════════════════════════════════════════════════ */}
      <div className="md:hidden">

        {/* ── Sticky top bar ── */}
        <div className="sticky top-16 z-30 px-4 pt-4 pb-3"
          style={{ background: "#faf7f0", borderBottom: "1px solid rgba(18,16,58,0.07)" }}>

          {/* Page title */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-['Playfair_Display'] text-[1.45rem] font-bold leading-tight" style={{ color: "#12103a" }}>
                {q ? `"${q}"` : categorySlug ? (categories.find((c) => c.slug === categorySlug)?.name ?? "Shop") : "Shop All"}
              </h1>
              {!loading && <p className="text-[11px] mt-0.5" style={{ color: "rgba(18,16,58,0.4)" }}>{total} pieces</p>}
            </div>
          </div>

          {/* Category chips — horizontal scroll */}
          <div ref={catRowRef} className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => updateParam("category", "")}
              className="shrink-0 px-4 py-2 rounded-full text-[12px] font-bold transition-all"
              style={{
                background: !categorySlug ? "#12103a" : "white",
                color: !categorySlug ? "#faf7f0" : "#5a5358",
                border: `1px solid ${!categorySlug ? "#12103a" : "rgba(18,16,58,0.12)"}`,
              }}>
              All
            </button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => updateParam("category", c.slug)}
                className="shrink-0 px-4 py-2 rounded-full text-[12px] font-bold transition-all"
                style={{
                  background: categorySlug === c.slug ? "#12103a" : "white",
                  color: categorySlug === c.slug ? "#faf7f0" : "#5a5358",
                  border: `1px solid ${categorySlug === c.slug ? "#12103a" : "rgba(18,16,58,0.12)"}`,
                }}>
                {c.name}
              </button>
            ))}
          </div>

          {/* Filter + Sort row */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex-1 justify-center relative"
              style={{
                background: hasActiveFilters ? "#12103a" : "white",
                color: hasActiveFilters ? "#faf7f0" : "#12103a",
                border: `1px solid ${hasActiveFilters ? "#12103a" : "rgba(18,16,58,0.12)"}`,
              }}>
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: "#c9a84c", color: "#0b0b14" }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setSortOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex-1 justify-center"
              style={{ background: "white", color: "#12103a", border: "1px solid rgba(18,16,58,0.12)" }}>
              <span className="material-symbols-outlined text-[18px]">sort</span>
              {SORTS.find(s => s.value === sort)?.label.split(":")[0] ?? "Sort"}
            </button>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex gap-2 mt-2.5 overflow-x-auto scrollbar-none pb-0.5">
              {selectedSizes.map((s) => (
                <button key={s} onClick={() => updateParam("size", s, true)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{ background: "rgba(61,43,122,0.1)", color: "#3d2b7a", border: "1px solid rgba(61,43,122,0.2)" }}>
                  {s} <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              ))}
              {selectedColors.map((c) => (
                <button key={c} onClick={() => updateParam("color", c, true)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{ background: "rgba(61,43,122,0.1)", color: "#3d2b7a", border: "1px solid rgba(61,43,122,0.2)" }}>
                  <span className="w-3 h-3 rounded-full inline-block shrink-0"
                    style={{ background: c.toLowerCase() === "white" ? "#eee" : c.toLowerCase() === "beige" ? "#d4b896" : c.toLowerCase() }} />
                  {c} <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              ))}
              {(minPrice || maxPrice) && (
                <button onClick={() => { updateParam("minPrice", ""); updateParam("maxPrice", ""); }}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{ background: "rgba(61,43,122,0.1)", color: "#3d2b7a", border: "1px solid rgba(61,43,122,0.2)" }}>
                  ৳{minPrice || "0"}–{maxPrice || "∞"} <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              )}
              <button onClick={clearFilters}
                className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                style={{ color: "#ba1a1a" }}>
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Product grid (mobile) ── */}
        <div className="px-3 pt-4 pb-28">
          {loading && allProducts.length === 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "white" }}>
                  <div className="aspect-[3/4] animate-pulse" style={{ background: "#e8e8e8" }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 rounded-full animate-pulse" style={{ background: "#e8e8e8", width: "75%" }} />
                    <div className="h-3 rounded-full animate-pulse" style={{ background: "#e8e8e8", width: "40%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : allProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(18,16,58,0.05)" }}>
                <span className="material-symbols-outlined text-3xl" style={{ color: "#c4c7c7" }}>search_off</span>
              </div>
              <p className="text-[14px] font-medium" style={{ color: "#5a5358" }}>No products found</p>
              <button onClick={clearFilters}
                className="px-6 py-2.5 rounded-full text-[13px] font-bold"
                style={{ background: "#12103a", color: "#faf7f0" }}>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {allProducts.map((p, i) => (
                  <MobileProductCard key={`${p.id}-${i}`} product={p} wishlist={wishlist} toggleWishlist={toggleWishlist} />
                ))}
              </div>

              {/* Load more */}
              {page < totalPages && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setPage((n) => n + 1)}
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-full text-[13px] font-bold transition-all active:scale-95"
                    style={{ background: "#12103a", color: "#faf7f0" }}>
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Load More
                        <span className="text-[11px] opacity-50 font-normal">({total - allProducts.length} left)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {page >= totalPages && allProducts.length > 0 && (
                <p className="text-center text-[12px] mt-10 pb-4" style={{ color: "rgba(18,16,58,0.3)" }}>
                  — All {total} pieces shown —
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          DESKTOP LAYOUT (unchanged structure, refined styles)
      ═══════════════════════════════════════════════════════ */}
      <div className="hidden md:block max-w-[1280px] mx-auto px-10 py-12">
        <div className="mb-8">
          {q ? (
            <h1 className="font-['Playfair_Display'] text-4xl font-bold" style={{ color: "#12103a" }}>
              Search: &ldquo;{q}&rdquo;
            </h1>
          ) : (
            <h1 className="font-['Playfair_Display'] text-4xl font-bold" style={{ color: "#12103a" }}>
              {categorySlug ? categories.find((c) => c.slug === categorySlug)?.name ?? "Shop" : "Shop All"}
            </h1>
          )}
          <p className="text-sm mt-1" style={{ color: "#747878" }}>{total} products</p>
        </div>

        <div className="flex gap-10">
          <div className="w-52 flex-shrink-0">
            <Sidebar />
          </div>
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

      {/* ═══════════════════════════════════════════════════════
          MOBILE FILTER BOTTOM SHEET
      ═══════════════════════════════════════════════════════ */}
      {filterOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0" style={{ background: "rgba(11,11,20,0.6)" }}
            onClick={() => setFilterOpen(false)} />

          {/* Sheet */}
          <div className="relative rounded-t-3xl overflow-hidden flex flex-col"
            style={{ background: "#faf7f0", maxHeight: "88vh" }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(18,16,58,0.15)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid rgba(18,16,58,0.08)" }}>
              <p className="text-[15px] font-bold" style={{ color: "#12103a" }}>Filters</p>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[12px] font-semibold" style={{ color: "#ba1a1a" }}>
                    Clear all
                  </button>
                )}
                <button onClick={() => setFilterOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(18,16,58,0.06)" }}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: "#12103a" }}>close</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-5 space-y-7 flex-1">

              {/* Sizes */}
              {filtersData.sizes.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#c9a84c" }}>Size</p>
                  <div className="flex flex-wrap gap-2">
                    {filtersData.sizes.map((s) => (
                      <button key={s} onClick={() => updateParam("size", s, true)}
                        className="px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all"
                        style={{
                          background: selectedSizes.includes(s) ? "#12103a" : "white",
                          color: selectedSizes.includes(s) ? "#faf7f0" : "#5a5358",
                          border: `1px solid ${selectedSizes.includes(s) ? "#12103a" : "rgba(18,16,58,0.12)"}`,
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors */}
              {filtersData.colors.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#c9a84c" }}>Color</p>
                  <div className="flex flex-wrap gap-3">
                    {filtersData.colors.map((c) => (
                      <button key={c} onClick={() => updateParam("color", c, true)} title={c}
                        className="flex flex-col items-center gap-1.5">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${selectedColors.includes(c) ? "ring-2 ring-offset-2 ring-[#12103a]" : ""}`}
                          style={{ background: c.toLowerCase() === "white" ? "#f9f9f9" : c.toLowerCase() === "beige" ? "#d4b896" : c.toLowerCase(), border: "1px solid rgba(18,16,58,0.1)" }}>
                          {selectedColors.includes(c) && <span className="material-symbols-outlined text-[14px]" style={{ color: c.toLowerCase() === "white" || c.toLowerCase() === "beige" || c.toLowerCase() === "yellow" ? "#12103a" : "white" }}>check</span>}
                        </span>
                        <span className="text-[10px]" style={{ color: "#5a5358" }}>{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#c9a84c" }}>Price Range</p>
                <div className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px]" style={{ color: "#5a5358" }}>৳</span>
                    <input type="number" placeholder="Min" value={minPrice}
                      onChange={(e) => updateParam("minPrice", e.target.value)}
                      className="w-full rounded-xl pl-7 pr-3 py-3 text-[14px] outline-none"
                      style={{ background: "white", border: "1px solid rgba(18,16,58,0.12)", color: "#12103a" }} />
                  </div>
                  <span style={{ color: "#c4c7c7" }}>—</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px]" style={{ color: "#5a5358" }}>৳</span>
                    <input type="number" placeholder="Max" value={maxPrice}
                      onChange={(e) => updateParam("maxPrice", e.target.value)}
                      className="w-full rounded-xl pl-7 pr-3 py-3 text-[14px] outline-none"
                      style={{ background: "white", border: "1px solid rgba(18,16,58,0.12)", color: "#12103a" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(18,16,58,0.08)" }}>
              <button onClick={() => setFilterOpen(false)}
                className="w-full py-4 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.98]"
                style={{ background: "#12103a", color: "#faf7f0" }}>
                Show {total} Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MOBILE SORT BOTTOM SHEET
      ═══════════════════════════════════════════════════════ */}
      {sortOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0" style={{ background: "rgba(11,11,20,0.6)" }}
            onClick={() => setSortOpen(false)} />
          <div className="relative rounded-t-3xl overflow-hidden" style={{ background: "#faf7f0" }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(18,16,58,0.15)" }} />
            </div>
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid rgba(18,16,58,0.08)" }}>
              <p className="text-[15px] font-bold" style={{ color: "#12103a" }}>Sort by</p>
              <button onClick={() => setSortOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(18,16,58,0.06)" }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: "#12103a" }}>close</span>
              </button>
            </div>
            <div className="px-4 py-3 pb-8">
              {SORTS.map((s) => (
                <button key={s.value}
                  onClick={() => { updateParam("sort", s.value); setSortOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-2xl mb-1 transition-all"
                  style={{
                    background: sort === s.value ? "rgba(18,16,58,0.06)" : "transparent",
                  }}>
                  <span className="text-[14px] font-medium" style={{ color: "#12103a" }}>{s.label}</span>
                  {sort === s.value && (
                    <span className="material-symbols-outlined text-[18px]" style={{ color: "#c9a84c" }}>check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mobile Product Card ─────────────────────────────────── */
function MobileProductCard({ product, wishlist, toggleWishlist }: { product: Product; wishlist: Set<string>; toggleWishlist: (e: React.MouseEvent, id: string) => void }) {
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice)) * 100)
    : 0;

  return (
    <Link href={`/products/${product.slug}`}
      className="block active:scale-[0.97] transition-transform"
      style={{ borderRadius: "16px", overflow: "hidden", background: "white" }}>

      {/* Image */}
      <div className="relative" style={{ aspectRatio: "3/4", background: "#ede8e0" }}>
        {product.images?.[0] ? (
          <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl" style={{ color: "#c8c6c5" }}>checkroom</span>
          </div>
        )}

        {/* Badges */}
        {hasDiscount && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: "#ba1a1a", color: "white" }}>
            -{discountPct}%
          </span>
        )}

        {/* Wishlist btn */}
        <button className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(250,247,240,0.9)", backdropFilter: "blur(8px)" }}
          onClick={(e) => toggleWishlist(e, product.id)}>
          <span className="material-symbols-outlined text-[16px]"
            style={{ color: wishlist.has(product.id) ? "#ba1a1a" : "#12103a", fontVariationSettings: wishlist.has(product.id) ? "'FILL' 1" : "'FILL' 0" }}>
            favorite
          </span>
        </button>
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-3">
        <p className="text-[13px] font-semibold leading-snug line-clamp-1 mb-1" style={{ color: "#12103a" }}>
          {product.name}
        </p>

        {/* Rating */}
        {product.averageRating && product.averageRating > 0 ? (
          <div className="flex items-center gap-1 mb-1.5">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-[10px]"
                  style={{ color: i < Math.round(product.averageRating!) ? "#c9a84c" : "#e2e2e2" }}>★</span>
              ))}
            </div>
            <span className="text-[10px]" style={{ color: "#9a9898" }}>({product._count?.reviews ?? 0})</span>
          </div>
        ) : null}

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[14px] font-bold" style={{ color: "#12103a" }}>
            ৳{Number(product.price).toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-[11px] line-through" style={{ color: "#9a9898" }}>
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
            className="object-cover transition-transform duration-500 group-hover:scale-105" />
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
