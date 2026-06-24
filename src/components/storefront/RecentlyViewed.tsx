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
   <section className="py-10 md:py-14 bg-[#faf7f0]">
  <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12">
    <h2 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-[#12103a] mb-6">
      Recently Viewed
    </h2>

    {/* Mobile Slider / Desktop Grid */}
    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide pb-2">
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/products/${p.slug}`}
          className="group flex-shrink-0 w-[160px] md:w-auto snap-start"
        >
          <div className="aspect-square rounded-2xl overflow-hidden bg-[#f4f3f3] mb-3">
            {p.imageUrl ? (
              <Image
                src={p.imageUrl}
                alt={p.name}
                width={300}
                height={300}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-[#c4c7c7]">
                  checkroom
                </span>
              </div>
            )}
          </div>

          <h3 className="text-sm font-medium text-black line-clamp-2 group-hover:text-[#c9a84c] transition-colors">
            {p.name}
          </h3>

          <p className="mt-1 text-sm font-semibold text-[#c9a84c]">
            ৳{Number(p.price).toLocaleString()}
          </p>
        </Link>
      ))}
    </div>
  </div>
</section>
  );
}
