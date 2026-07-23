"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import AuraLoadingScreen from "@/components/ui/AuraLoadingScreen";

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string; name: string; slug: string; price: number;
    images: { url: string }[];
    variants: { color: string | null; size: string | null }[];
  };
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("ag_authed");
    fetch("/api/account/wishlist", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function remove(productId: string) {
    setRemoving(productId);
    const token = localStorage.getItem("ag_authed");
    await fetch("/api/account/wishlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId }),
    });
    setItems((prev) => prev.filter((i) => i.productId !== productId));
    setRemoving(null);
  }

  if (loading) {
    return <AuraLoadingScreen fullScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="dd-display text-[28px] text-fg">Wishlist</h2>
          <p className="text-fg-muted text-[14px] mt-1">{items.length} {items.length === 1 ? "item" : "items"} saved</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl">
          <EmptyState
            icon="favorite"
            title="Your wishlist is empty"
            body="Save items you love and come back to them anytime."
            action={{ href: "/shop", label: "Explore Collection" }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => {
            const v = item.product.variants[0];
            const variant = [v?.color, v?.size].filter(Boolean).join(" · ");
            return (
              <div key={item.id} className="bg-surface border border-line rounded-2xl overflow-hidden group">
                <div className="relative aspect-[4/5] bg-surface-raised">
                  {item.product.images[0] ? (
                    <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-5xl text-fg-subtle">checkroom</span>
                    </div>
                  )}
                  <button
                    onClick={() => remove(item.productId)}
                    disabled={removing === item.productId}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-canvas shadow flex items-center justify-center text-fg-subtle hover:text-[color:var(--danger)] opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <div className="p-4">
                  <p className="font-medium text-[15px] text-fg">{item.product.name}</p>
                  {variant && <p className="text-[13px] text-fg-muted mt-0.5">{variant}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="dd-display text-[18px] text-fg">
                      ৳{Number(item.product.price).toLocaleString()}
                    </span>
                    <Link href={`/products/${item.product.slug}`}
                      className="px-4 py-2 border border-line-strong text-fg text-[12px] font-medium rounded-full hover:bg-surface-raised transition-all">
                      View Product
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
