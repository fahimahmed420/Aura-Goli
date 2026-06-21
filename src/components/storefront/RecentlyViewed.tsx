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
    <section className="py-10 md:py-14" style={{ background: "#faf7f0" }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-14">
        <h2 className="font-['Playfair_Display'] text-xl md:text-2xl font-bold mb-6" style={{ color: "#12103a" }}>
          Recently Viewed
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 md:mx-0 md:px-0 snap-x snap-mandatory md:grid md:grid-cols-6">
          {products.map(p => (
            <Link key={p.id} href={`/products/${p.slug}`}
              className="shrink-0 snap-start w-36 md:w-auto group">
              <div className="aspect-square rounded-xl overflow-hidden mb-2" style={{ background: "#f4f3f3" }}>
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt={p.name} width={160} height={160}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-[#c4c7c7]">checkroom</span>
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold text-black truncate">{p.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "#c9a84c" }}>৳{Number(p.price).toLocaleString()}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
