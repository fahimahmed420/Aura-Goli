"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-['Playfair_Display'] text-[28px] font-semibold text-black">Wishlist</h2>
          <p className="text-[#444748] text-[14px] mt-1">{items.length} {items.length === 1 ? "item" : "items"} saved</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-[#e8e8e8] rounded-2xl p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-[#c4c7c7] mb-4 block">favorite</span>
          <h3 className="font-['Playfair_Display'] text-[22px] font-semibold text-black mb-2">Your wishlist is empty</h3>
          <p className="text-[#444748] text-[14px] mb-6">Save items you love and come back to them anytime.</p>
          <Link href="/shop" className="inline-block bg-black text-white px-8 py-3 rounded-full text-[13px] font-semibold hover:opacity-80 transition-opacity">
            Explore Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => {
            const v = item.product.variants[0];
            const variant = [v?.color, v?.size].filter(Boolean).join(" · ");
            return (
              <div key={item.id} className="bg-white border border-[#e8e8e8] rounded-2xl overflow-hidden group">
                <div className="relative aspect-[4/5] bg-[#eeeeee]">
                  {item.product.images[0] ? (
                    <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-5xl text-[#c4c7c7]">checkroom</span>
                    </div>
                  )}
                  <button
                    onClick={() => remove(item.productId)}
                    disabled={removing === item.productId}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-[#444748] hover:text-[#ba1a1a] opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-[15px] text-black">{item.product.name}</p>
                  {variant && <p className="text-[13px] text-[#444748] mt-0.5">{variant}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-['Playfair_Display'] text-[18px] font-semibold text-black">
                      ৳{Number(item.product.price).toLocaleString()}
                    </span>
                    <Link href={`/products/${item.product.slug}`}
                      className="px-4 py-2 border border-black text-black text-[12px] font-semibold rounded-full hover:bg-black hover:text-white transition-all">
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
