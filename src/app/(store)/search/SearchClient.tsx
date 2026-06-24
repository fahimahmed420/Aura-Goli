"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { usePageContentLoading } from "@/components/storefront/pageLoading";

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

  // Hold the page-loading curtain while search results are loading.
  usePageContentLoading(loading);

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

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Search bar hero */}
      <div className="bg-black px-4 md:px-12 py-14">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-[#9f97ff] uppercase tracking-widest mb-3">Search</p>
          <form onSubmit={handleSubmit} className="flex gap-0">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-white/10 text-white border border-white/20 px-6 py-4 text-lg placeholder:text-white/40 focus:outline-none focus:bg-white/15 transition-all"
              placeholder="Search for T-shirts, graphics, oversized…"
              autoFocus
            />
            <button
              type="submit"
              className="bg-[#5951b4] text-white px-6 py-4 hover:bg-[#4845a0] transition-colors flex items-center"
            >
              <span className="material-symbols-outlined text-2xl">search</span>
            </button>
          </form>
          {q && searched && !loading && (
            <p className="text-white/60 text-sm mt-3">
              {total > 0 ? `${total} result${total !== 1 ? "s" : ""} for "${q}"` : `No results for "${q}"`}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-12 py-12">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-[#c4c7c7] block mb-4">search_off</span>
            <h2 className="font-['Playfair_Display'] text-2xl font-bold text-black mb-3">No results found</h2>
            <p className="text-[#444748] mb-8">Try different keywords or browse our collections.</p>
            <Link href="/shop" className="inline-block bg-black text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#5951b4] transition-colors">
              Browse All Products
            </Link>
          </div>
        )}

        {/* Empty state */}
        {!loading && !searched && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-[#c4c7c7] block mb-4">manage_search</span>
            <p className="text-[#444748]">Start typing to search our collection.</p>
          </div>
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {results.map((p) => {
                const inStock = p.variants.some((v) => v.stockQuantity > 0);
                const hasDiscount = p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price);
                return (
                  <Link key={p.id} href={`/products/${p.slug}`} className="group">
                    <div className="aspect-[3/4] bg-[#e2e2e2] relative overflow-hidden mb-3">
                      {p.images[0] ? (
                        <Image src={p.images[0].url} alt={p.images[0].altText ?? p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-[#c4c7c7]">checkroom</span>
                        </div>
                      )}
                      {!inStock && (
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-semibold px-2 py-1">
                          Sold Out
                        </div>
                      )}
                      {hasDiscount && (
                        <div className="absolute top-2 right-2 bg-[#5951b4] text-white text-xs font-semibold px-2 py-1">
                          Sale
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#747878] uppercase tracking-wider mb-1">{p.category?.name}</p>
                    <p className="text-sm font-semibold text-black group-hover:text-[#5951b4] transition-colors leading-snug mb-1.5">{p.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-black">৳{Number(p.price).toLocaleString()}</span>
                      {hasDiscount && (
                        <span className="text-xs text-[#747878] line-through">৳{Number(p.compareAtPrice).toLocaleString()}</span>
                      )}
                    </div>
                    {p._count.reviews > 0 && (
                      <p className="text-xs text-[#747878] mt-1">{p._count.reviews} review{p._count.reviews !== 1 ? "s" : ""}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
