"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import ProductCard, { type ProductCardData } from "@/components/ui/ProductCard";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";

interface SearchProduct {
  id: string; name: string; slug: string; price: number; compareAtPrice: number | null;
  category: { name: string; slug: string } | null;
  images: { url: string; altText: string | null }[];
  variants: { color: string | null; size: string | null; stockQuantity: number }[];
  _count: { reviews: number };
}

export default function SearchClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const q = sp.get("q") ?? "";

  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.products ?? []);
        setTotal(data.pagination?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (q) doSearch(q);
  }, [q, doSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const cards: ProductCardData[] = results.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : undefined,
    images: p.images,
    categoryName: p.category?.name,
    reviewCount: p._count.reviews,
    stock: p.variants.reduce((s, v) => s + v.stockQuantity, 0),
  }));

  return (
    <div className="min-h-screen bg-canvas">
      {/* Search bar hero */}
      <div className="bg-surface border-b border-line px-4 md:px-12 py-14">
        <div className="max-w-3xl mx-auto">
          <p className="dd-eyebrow text-fg-subtle mb-3">Search</p>
          <form onSubmit={handleSubmit} className="flex gap-0">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-[var(--field-bg)] text-fg border border-[var(--field-border)] px-6 py-4 text-lg placeholder:text-fg-subtle focus:outline-none focus:border-[var(--field-border-focus)] transition-colors"
              placeholder="Search for T-shirts, graphics, oversized…"
              autoFocus
            />
            <button
              type="submit"
              className="bg-accent text-accent-fg px-6 py-4 hover:bg-accent-hover transition-colors flex items-center"
            >
              <span className="material-symbols-outlined text-2xl">search</span>
            </button>
          </form>
          {q && searched && !loading && (
            <p className="text-fg-muted text-sm mt-3">
              {total > 0 ? `${total} result${total !== 1 ? "s" : ""} for "${q}"` : `No results for "${q}"`}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-12 py-16">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Spinner size={32} />
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-fg-subtle block mb-4">search_off</span>
            <h2 className="dd-display text-2xl text-fg mb-3">No results found</h2>
            <p className="text-fg-muted mb-8">Try different keywords or browse our collections.</p>
            <Button href="/shop" variant="primary">Browse all products</Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !searched && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-fg-subtle block mb-4">manage_search</span>
            <p className="text-fg-muted">Start typing to search our collection.</p>
          </div>
        )}

        {/* Results grid */}
        {!loading && cards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-14">
            {cards.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
