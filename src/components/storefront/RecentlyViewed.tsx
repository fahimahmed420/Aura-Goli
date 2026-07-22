"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface RecentProduct { id: string; slug: string; name: string; price: number; imageUrl?: string; }

export const RECENTLY_VIEWED_KEY = "ag_recently_viewed";

export function trackView(product: RecentProduct) {
  if (typeof window === "undefined") return;
  try {
    const existing: RecentProduct[] = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) ?? "[]");
    const filtered = existing.filter(p => p.id !== product.id);
    const updated = [product, ...filtered].slice(0, 8);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

export default function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [products, setProducts] = useState<RecentProduct[]>([]);

  useEffect(() => {
    try {
      const all: RecentProduct[] = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) ?? "[]");
      setProducts(all.filter(p => p.id !== excludeId).slice(0, 6));
    } catch { /* ignore */ }
  }, [excludeId]);

  if (products.length === 0) return null;

  return (
    <section className="py-10 md:py-16 bg-canvas">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12">
        <p className="dd-eyebrow text-fg-subtle mb-4">Recently viewed</p>

        {/* Mobile Slider / Desktop Grid */}
        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-none pb-2">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="dd-card group flex-shrink-0 w-[160px] md:w-auto snap-start"
            >
              <div className="dd-media aspect-square overflow-hidden bg-surface-raised mb-3" style={{ borderRadius: "var(--radius-card)" }}>
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-fg-subtle">
                      checkroom
                    </span>
                  </div>
                )}
              </div>

              <h3 className="text-sm font-medium text-fg line-clamp-2 group-hover:text-accent transition-colors">
                {p.name}
              </h3>

              <p className="mt-1 text-sm font-medium text-fg-muted">
                ৳{Number(p.price).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
