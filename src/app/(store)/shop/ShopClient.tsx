"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import LoadingScreen from "@/components/storefront/LoadingScreen";
import Badge from "@/components/ui/Badge";

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

/** Named-color swatches that don't parse as CSS colors as-is. */
function swatchColor(c: string) {
  const k = c.toLowerCase();
  if (k === "white") return "#f4f2ec";
  if (k === "beige") return "#d4b896";
  return k;
}

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
  // getAll() returns a fresh array every render, so memoize against the
  // (navigation-stable) search params object — otherwise these can't be used
  // as effect/callback dependencies without re-fetching on every render.
  const selectedColors = useMemo(() => sp.getAll("color"), [sp]);
  const selectedSizes  = useMemo(() => sp.getAll("size"), [sp]);
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
    const token = localStorage.getItem("ag_authed");
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
    const token = localStorage.getItem("ag_authed");
    if (!token) { window.location.href = "/login"; return; }
    const wasWishlisted = wishlist.has(productId);
    // Optimistic toggle, rolled back if the request fails.
    setWishlist((prev) => {
      const next = new Set(prev);
      if (wasWishlisted) next.delete(productId); else next.add(productId);
      return next;
    });
    fetch("/api/account/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId }),
    }).catch(() => {
      setWishlist((prev) => {
        const next = new Set(prev);
        if (wasWishlisted) next.add(productId); else next.delete(productId);
        return next;
      });
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
    let res = await fetch(`/api/products?${params}`);
    if (!res.ok) {
      // One retry — a cold first request can transiently fail; don't blank the shop.
      await new Promise((r) => setTimeout(r, 600));
      res = await fetch(`/api/products?${params}`);
    }
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    const fetched: Product[] = data.products ?? [];
    setTotal(data.pagination?.total ?? 0);
    if (append) setAllProducts((prev) => [...prev, ...fetched]);
    else { setAllProducts(fetched); setProducts(fetched); }
    setProducts(fetched);
    setLoading(false);
  }, [page, q, sort, categorySlug, minPrice, maxPrice, selectedColors, selectedSizes]);

  useEffect(() => { fetchProducts(page > 1); }, [fetchProducts, page]);

  const totalPages        = Math.ceil(total / 12);
  const hasActiveFilters  = !!(categorySlug || selectedColors.length || selectedSizes.length || minPrice || maxPrice);
  const activeFilterCount = (categorySlug ? 1 : 0) + selectedColors.length + selectedSizes.length + (minPrice || maxPrice ? 1 : 0);

  /* ── Desktop Sidebar ──
     Built as a JSX value, not a component defined during render: a nested
     component gets a fresh identity every render, so React unmounts and
     remounts the whole subtree — which drops focus out of the price inputs
     on every keystroke. */
  const sidebar = (
    <aside className="space-y-8">
      <div>
        <p className="dd-eyebrow text-fg-subtle mb-4">Category</p>
        <div className="space-y-2">
          <button onClick={() => updateParam("category", "")}
            className={`block w-full text-left text-sm transition-colors ${!categorySlug ? "font-semibold text-fg" : "text-fg-muted hover:text-fg"}`}>
            All Products <span className="text-fg-subtle">({total})</span>
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => updateParam("category", c.slug)}
              className={`block w-full text-left text-sm transition-colors ${categorySlug === c.slug ? "font-semibold text-fg" : "text-fg-muted hover:text-fg"}`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      {filtersData.sizes.length > 0 && (
        <div>
          <p className="dd-eyebrow text-fg-subtle mb-4">Size</p>
          <div className="grid grid-cols-4 gap-2">
            {filtersData.sizes.map((s) => (
              <button key={s} onClick={() => updateParam("size", s, true)}
                className={`py-2 text-xs font-medium border transition-colors ${selectedSizes.includes(s) ? "bg-accent text-accent-fg border-accent" : "border-line-strong text-fg-muted hover:border-fg-subtle"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {filtersData.colors.length > 0 && (
        <div>
          <p className="dd-eyebrow text-fg-subtle mb-4">Color</p>
          <div className="flex flex-wrap gap-3">
            {filtersData.colors.map((c) => (
              <button key={c} onClick={() => updateParam("color", c, true)} title={c}
                className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColors.includes(c) ? "border-accent scale-110" : "border-transparent hover:border-line-strong"}`}
                style={{ backgroundColor: swatchColor(c) }} />
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="dd-eyebrow text-fg-subtle mb-4">Price</p>
        <div className="flex gap-2 items-center">
          <input type="number" placeholder="Min" value={minPriceLocal}
            onChange={(e) => updatePriceParam("minPrice", e.target.value)}
            className="field-input w-full text-sm"
            style={{ padding: "0.5rem 0.65rem" }} />
          <span className="text-fg-subtle text-xs shrink-0">—</span>
          <input type="number" placeholder="Max" value={maxPriceLocal}
            onChange={(e) => updatePriceParam("maxPrice", e.target.value)}
            className="field-input w-full text-sm"
            style={{ padding: "0.5rem 0.65rem" }} />
        </div>
      </div>
      {hasActiveFilters && (
        <button onClick={clearFilters} className="text-xs font-medium uppercase tracking-widest hover:underline" style={{ color: "var(--danger)" }}>
          Clear all filters
        </button>
      )}
    </aside>
  );

  return (
    <div className="bg-canvas" style={{ minHeight: "100vh" }}>
      <LoadingScreen isLoading={loading} />

      {/* ═══════════════════════════════════════════════════════
          MOBILE LAYOUT
      ═══════════════════════════════════════════════════════ */}
      <div className="md:hidden">

        {/* ── Sticky bar: title + categories + filter/sort buttons ── */}
        <div className="sticky z-20 px-3 pt-2 pb-2 bg-canvas/96 backdrop-blur-xl border-b border-line" style={{ top: 64 }}>
          <div className="flex items-baseline gap-2 mb-1.5">
            <h1 className="text-[15px] font-semibold text-fg">
              {q ? `"${q}"` : categorySlug ? (categories.find(c => c.slug === categorySlug)?.name ?? "Shop") : "All Products"}
            </h1>
            {!loading && <span className="text-[11px] text-fg-subtle">{total}</span>}
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button onClick={() => updateParam("category", "")}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border ${!categorySlug ? "bg-accent text-accent-fg border-accent" : "bg-surface text-fg-muted border-line"}`}>
              All
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => updateParam("category", c.slug)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border ${categorySlug === c.slug ? "bg-accent text-accent-fg border-accent" : "bg-surface text-fg-muted border-line"}`}>
                {c.name}
              </button>
            ))}
          </div>

          {/* Filter + Sort buttons */}
          <div className="flex gap-2 mt-1.5">
            <button onClick={() => setFilterOpen(true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium flex-1 justify-center relative border ${hasActiveFilters ? "bg-accent text-accent-fg border-accent" : "bg-surface text-fg border-line"}`}>
              <span className="material-symbols-outlined text-[15px]">tune</span>
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-canvas text-accent border border-accent">{activeFilterCount}</span>
              )}
            </button>
            <button onClick={() => setSortOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium flex-1 justify-center bg-surface text-fg border border-line">
              <span className="material-symbols-outlined text-[15px]">swap_vert</span>
              {SORTS.find(s => s.value === sort)?.label.replace(" First","").split(":")[0] ?? "Sort"}
            </button>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {selectedSizes.map(s => (
                <button key={s} onClick={() => updateParam("size", s, true)}
                  className="shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-tint text-accent border border-accent/25">
                  {s} <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              ))}
              {selectedColors.map(c => (
                <button key={c} onClick={() => updateParam("color", c, true)}
                  className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-tint text-accent border border-accent/25">
                  <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: swatchColor(c) }} />
                  {c} <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              ))}
              {(minPrice || maxPrice) && (
                <button onClick={() => { updateParam("minPrice", ""); updateParam("maxPrice", ""); }}
                  className="shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-tint text-accent border border-accent/25">
                  ৳{minPrice||"0"}–{maxPrice||"∞"} <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              )}
              <button onClick={clearFilters} className="shrink-0 px-2 py-0.5 text-[10px] font-medium" style={{ color: "var(--danger)" }}>Clear all</button>
            </div>
          )}
        </div>

        {/* ── Product grid ── */}
        <div className="px-2 pt-3 pb-28">
          {loading && allProducts.length === 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-surface">
                  <div className="aspect-[3/4] animate-pulse bg-surface-raised" />
                  <div className="p-2 space-y-1.5">
                    <div className="h-2.5 rounded-full animate-pulse bg-surface-raised" style={{ width: "78%" }} />
                    <div className="h-2.5 rounded-full animate-pulse bg-surface-raised" style={{ width: "42%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : allProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="material-symbols-outlined text-3xl text-fg-subtle">search_off</span>
              <p className="text-[13px] font-medium text-fg-muted">Nothing found</p>
              <button onClick={clearFilters}
                className="px-5 py-2 rounded-full text-[12px] font-medium active:scale-95 transition-transform bg-accent text-accent-fg">
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
                  <div key={`sk-${i}`} className="rounded-xl overflow-hidden bg-surface">
                    <div className="aspect-[3/4] animate-pulse bg-surface-raised" />
                    <div className="p-2 space-y-1.5">
                      <div className="h-2.5 rounded-full animate-pulse bg-surface-raised" style={{ width: "75%" }} />
                      <div className="h-2.5 rounded-full animate-pulse bg-surface-raised" style={{ width: "40%" }} />
                    </div>
                  </div>
                ))}
              </div>

              {page < totalPages && (
                <div className="mt-5 flex justify-center">
                  <button onClick={() => setPage((n) => n + 1)} disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[12px] font-medium transition-all active:scale-95 disabled:opacity-60 bg-accent text-accent-fg">
                    {loading ? (
                      <span className="w-3.5 h-3.5 border-2 border-accent-fg/30 border-t-accent-fg rounded-full animate-spin" />
                    ) : (
                      <>Load More <span className="opacity-60 font-normal">({total - allProducts.length})</span></>
                    )}
                  </button>
                </div>
              )}

              {page >= totalPages && allProducts.length > 0 && (
                <p className="text-center text-[10px] mt-6 pb-2 text-fg-subtle">
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
            background: "var(--overlay)",
            opacity: filterOpen ? 1 : 0,
            transition: "opacity 0.2s ease",
          }} />
          <div className="bg-surface"
            style={{
              position: "relative", width: "100%", maxWidth: 360,
              borderRadius: 18,
              maxHeight: "75dvh",
              display: "flex", flexDirection: "column",
              opacity: filterOpen ? 1 : 0,
              transform: filterOpen ? "scale(1)" : "scale(0.95)",
              transition: "opacity 0.2s ease, transform 0.2s ease",
            }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 shrink-0 border-b border-line">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-semibold text-fg">Filters</p>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-fg">{activeFilterCount}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button onClick={() => { clearFilters(); setFilterOpen(false); }}
                    className="text-[11px] font-medium" style={{ color: "var(--danger)" }}>Clear all</button>
                )}
                <button onClick={() => setFilterOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-surface-raised text-fg">
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="overflow-y-auto flex-1 px-4 py-3.5 space-y-4" style={{ overscrollBehavior: "contain" }}>
              {filtersData.sizes.length > 0 && (
                <div>
                  <p className="dd-eyebrow text-fg-subtle mb-2.5">Size</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filtersData.sizes.map(s => (
                      <button key={s} onClick={() => updateParam("size", s, true)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-medium active:scale-95 transition-transform border ${selectedSizes.includes(s) ? "bg-accent text-accent-fg border-accent" : "bg-canvas text-fg-muted border-line"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {filtersData.colors.length > 0 && (
                <div>
                  <p className="dd-eyebrow text-fg-subtle mb-2.5">Color</p>
                  <div className="flex flex-wrap gap-2.5">
                    {filtersData.colors.map(c => (
                      <button key={c} onClick={() => updateParam("color", c, true)} title={c}
                        className="flex flex-col items-center gap-1">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 border border-line ${selectedColors.includes(c) ? "ring-2 ring-offset-1 ring-offset-surface ring-accent" : ""}`}
                          style={{ background: swatchColor(c) }}>
                          {selectedColors.includes(c) && (
                            <span className="material-symbols-outlined text-[11px]"
                              style={{ color: ["white","beige","yellow"].includes(c.toLowerCase()) ? "#0b0b14" : "#faf7f0" }}>check</span>
                          )}
                        </span>
                        <span className="text-[9px] font-medium text-fg-muted">{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="dd-eyebrow text-fg-subtle mb-2.5">Price Range</p>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-fg-subtle">৳</span>
                    <input type="number" placeholder="Min" value={minPriceLocal}
                      onChange={e => updatePriceParam("minPrice", e.target.value)}
                      className="field-input w-full text-[15px]" style={{ padding: "0.55rem 0.65rem 0.55rem 1.5rem" }} />
                  </div>
                  <span className="text-fg-subtle text-xs shrink-0">—</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-fg-subtle">৳</span>
                    <input type="number" placeholder="Max" value={maxPriceLocal}
                      onChange={e => updatePriceParam("maxPrice", e.target.value)}
                      className="field-input w-full text-[15px]" style={{ padding: "0.55rem 0.65rem 0.55rem 1.5rem" }} />
                  </div>
                </div>
              </div>
            </div>
            {/* CTA */}
            <div className="px-4 pt-2.5 pb-4 shrink-0 border-t border-line">
              <button onClick={() => setFilterOpen(false)}
                className="w-full py-2.5 rounded-xl text-[12px] font-medium active:scale-[0.98] transition-transform bg-accent text-accent-fg">
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
            background: "var(--overlay)",
            opacity: sortOpen ? 1 : 0,
            transition: "opacity 0.2s ease",
          }} />
          <div className="bg-surface"
            style={{
              position: "relative", width: "100%", maxWidth: 340,
              borderRadius: 18,
              opacity: sortOpen ? 1 : 0,
              transform: sortOpen ? "scale(1)" : "scale(0.95)",
              transition: "opacity 0.2s ease, transform 0.2s ease",
            }}>
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-line">
              <p className="text-[14px] font-semibold text-fg">Sort by</p>
              <button onClick={() => setSortOpen(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-surface-raised text-fg">
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            </div>
            <div className="px-2.5 py-2 pb-3">
              {SORTS.map(s => (
                <button key={s.value}
                  onClick={() => { updateParam("sort", s.value); setSortOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl mb-1 active:scale-[0.98] transition-transform ${sort === s.value ? "bg-surface-raised" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${sort === s.value ? "bg-accent" : "bg-surface-raised"}`}>
                    <span className={`material-symbols-outlined text-[15px] ${sort === s.value ? "text-accent-fg" : "text-fg-subtle"}`}>{s.icon}</span>
                  </div>
                  <span className="text-[12px] font-medium flex-1 text-left text-fg">{s.label}</span>
                  {sort === s.value && (
                    <span className="material-symbols-outlined text-[17px] text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
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
      <div className="hidden md:block max-w-[1280px] mx-auto px-10 py-16">
        <div className="mb-10">
          <h1 className="dd-display text-4xl text-fg">
            {q ? `Search: "${q}"` : categorySlug ? (categories.find((c) => c.slug === categorySlug)?.name ?? "Shop") : "Shop All"}
          </h1>
          <p className="text-sm mt-1 text-fg-subtle">{total} products</p>
        </div>
        <div className="flex gap-10">
          <div className="w-52 flex-shrink-0">{sidebar}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-fg-subtle">{total} products</p>
              <select value={sort} onChange={(e) => updateParam("sort", e.target.value)}
                className="field-input text-sm w-auto py-2">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {loading ? (
              <div className="grid grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse overflow-hidden bg-surface" style={{ borderRadius: "var(--radius-card)" }}>
                    <div className="aspect-[3/4] bg-surface-raised" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 rounded-full bg-surface-raised" style={{ width: "75%" }} />
                      <div className="h-4 rounded-full bg-surface-raised" style={{ width: "33%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <span className="material-symbols-outlined text-5xl text-fg-subtle">search_off</span>
                <p className="text-fg-muted">No products found.</p>
                <button onClick={clearFilters} className="text-sm font-medium hover:underline text-accent">Clear filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-5">
                  {products.map((p) => <DesktopProductCard key={p.id} product={p} />)}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-12">
                    <button onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page === 1}
                      className="px-4 py-2 border border-line-strong text-sm text-fg-muted disabled:opacity-40 hover:bg-surface transition-colors">Prev</button>
                    <span className="text-sm text-fg-muted">Page {page} of {totalPages}</span>
                    <button onClick={() => setPage((n) => Math.min(totalPages, n + 1))} disabled={page === totalPages}
                      className="px-4 py-2 border border-line-strong text-sm text-fg-muted disabled:opacity-40 hover:bg-surface transition-colors">Next</button>
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
  const [isHovering, setIsHovering] = useState(false);
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice!)) * 100)
    : 0;
  const wishlisted = wishlist.has(product.id);
  const hasSecond = !!product.images?.[1];
  const slideStyle = (isSecond: boolean): React.CSSProperties => ({
    transform: isSecond
      ? (isHovering ? 'translateX(0%)' : 'translateX(-100%)')
      : (isHovering && hasSecond ? 'translateX(100%)' : 'translateX(0%)'),
    transition: 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    willChange: 'transform',
  });

  return (
    <Link href={`/products/${product.slug}`}
      className="block active:scale-[0.97] transition-transform duration-150 bg-surface"
      style={{ borderRadius: 12, overflow: "hidden" }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}>
      <div className="relative overflow-hidden bg-surface-raised" style={{ aspectRatio: "3/4" }}>
        {product.images?.[0] ? (
          <>
            <Image src={product.images[0].url} alt={product.name} fill className="object-cover"
              sizes="(max-width: 768px) 50vw, 200px" style={slideStyle(false)} />
            {hasSecond && (
              <Image src={product.images[1].url} alt={product.name} fill className="object-cover"
                sizes="(max-width: 768px) 50vw, 200px" style={slideStyle(true)} />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-fg-subtle">checkroom</span>
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-1.5 left-1.5">
            <Badge tone="sale">-{discountPct}%</Badge>
          </span>
        )}
        <button
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wishlisted}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 bg-canvas/85 backdrop-blur"
          onClick={(e) => toggleWishlist(e, product.id)}>
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]"
            style={{ color: wishlisted ? "var(--danger)" : "var(--fg)", fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}>
            favorite
          </span>
        </button>
      </div>
      <div className="px-2 pt-2 pb-2.5">
        <p className="text-[12px] font-medium leading-tight line-clamp-1 text-fg">
          {product.name}
        </p>
        {product.averageRating && product.averageRating > 0 ? (
          <p className="text-[10px] mt-0.5 text-accent">
            {"★".repeat(Math.round(product.averageRating))}
            <span className="text-fg-subtle"> ({product._count?.reviews ?? 0})</span>
          </p>
        ) : null}
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-[13px] font-semibold text-fg">
            ৳{Number(product.price).toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-[10px] line-through text-fg-subtle">
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
  const [isHovering, setIsHovering] = useState(false);
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const hasSecond = !!product.images?.[1];
  const slideStyle = (isSecond: boolean): React.CSSProperties => ({
    transform: isSecond
      ? (isHovering ? 'translateX(0%)' : 'translateX(-100%)')
      : (isHovering && hasSecond ? 'translateX(100%)' : 'translateX(0%)'),
    transition: 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    willChange: 'transform',
  });

  return (
    <Link href={`/products/${product.slug}`} className="dd-card group block"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}>
      <div className="dd-media aspect-[3/4] relative overflow-hidden mb-5 bg-surface-raised" style={{ borderRadius: "var(--radius-card)" }}>
        {product.images?.[0] ? (
          <>
            <Image src={product.images[0].url} alt={product.name} fill
              className="object-cover"
              sizes="(min-width: 768px) 300px, 100vw"
              style={slideStyle(false)} />
            {hasSecond && (
              <Image src={product.images[1].url} alt={product.name} fill
                className="object-cover"
                sizes="(min-width: 768px) 300px, 100vw"
                style={slideStyle(true)} />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-fg-subtle">checkroom</span>
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-4 left-4 z-10"><Badge tone="sale">Sale</Badge></span>
        )}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
          <div className="bg-accent text-accent-fg text-center py-4 text-[11px] font-medium uppercase tracking-[0.2em]">
            View piece
          </div>
        </div>
      </div>
      <p className="text-[15px] font-medium leading-snug text-fg mb-2 line-clamp-2">{product.name}</p>
      {product.averageRating && product.averageRating > 0 ? (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex gap-0.5 text-fg-subtle">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} viewBox="0 0 20 20" className="w-3 h-3" fill={i < Math.round(product.averageRating!) ? "var(--accent)" : "none"} stroke="currentColor" strokeWidth="1.2">
                <path d="m10 2 2.4 5.1 5.6.8-4 4 .9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-4 5.6-.8z" />
              </svg>
            ))}
          </div>
          <span className="text-[11px] text-fg-subtle">({product._count?.reviews ?? 0})</span>
        </div>
      ) : null}
      <div className="flex items-baseline gap-2.5">
        <span className="text-[15px] font-medium text-fg">৳{Number(product.price).toLocaleString()}</span>
        {hasDiscount && <span className="text-[13px] text-fg-subtle line-through">৳{Number(product.compareAtPrice).toLocaleString()}</span>}
      </div>
    </Link>
  );
}
