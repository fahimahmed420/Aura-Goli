"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

interface CompareProduct {
  id: string; slug: string; name: string; price: number; compareAtPrice?: number;
  imageUrl?: string; material?: string; sizes?: string[]; rating?: number;
}

const COMPARE_KEY = "ag_compare";

interface CompareCtx {
  items: CompareProduct[];
  add: (p: CompareProduct) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
}
const CompareContext = createContext<CompareCtx>({ items: [], add: () => {}, remove: () => {}, has: () => false });

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareProduct[]>([]);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(COMPARE_KEY) ?? "[]")); } catch { /* ignore */ }
  }, []);

  const sync = useCallback((next: CompareProduct[]) => {
    setItems(next);
    localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
  }, []);

  const add = useCallback((p: CompareProduct) => {
    setItems(prev => {
      if (prev.find(x => x.id === p.id) || prev.length >= 3) return prev;
      const next = [...prev, p];
      localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => { const next = prev.filter(x => x.id !== id); localStorage.setItem(COMPARE_KEY, JSON.stringify(next)); return next; });
  }, []);

  const has = useCallback((id: string) => items.some(x => x.id === id), [items]);

  return <CompareContext.Provider value={{ items, add, remove, has }}>{children}</CompareContext.Provider>;
}

export function useCompare() { return useContext(CompareContext); }

export function CompareButton({ product }: { product: CompareProduct }) {
  const { add, remove, has } = useCompare();
  const active = has(product.id);
  return (
    <button
      onClick={() => active ? remove(product.id) : add(product)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: active ? "rgba(18,16,58,0.08)" : "transparent",
        color: active ? "#12103a" : "#747878",
        border: "1px solid",
        borderColor: active ? "#12103a" : "#e8e8e8",
      }}>
      <span className="material-symbols-outlined text-sm">{active ? "compare_arrows" : "add_chart"}</span>
      {active ? "Comparing" : "Compare"}
    </button>
  );
}

export function CompareDrawer() {
  const { items, remove } = useCompare();
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  const ROWS = [
    { label: "Price", render: (p: CompareProduct) => <span className="font-bold text-black">৳{Number(p.price).toLocaleString()}</span> },
    { label: "Material", render: (p: CompareProduct) => <span className="text-[#444748]">{p.material ?? "—"}</span> },
    { label: "Sizes", render: (p: CompareProduct) => <span className="text-[#444748]">{p.sizes?.join(", ") ?? "—"}</span> },
    { label: "Rating", render: (p: CompareProduct) => p.rating ? (
      <span className="flex items-center gap-1">
        <span style={{ color: "#c9a84c" }}>★</span> <span className="text-[#444748]">{p.rating.toFixed(1)}</span>
      </span>
    ) : <span className="text-[#c4c7c7]">—</span> },
  ];

  return (
    <>
      {/* Floating trigger */}
      <div className="fixed bottom-24 md:bottom-6 right-4 z-40">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg font-bold text-sm transition-all active:scale-95"
          style={{ background: "#12103a", color: "#faf7f0", boxShadow: "0 8px 30px rgba(11,11,20,0.5)" }}>
          <span className="material-symbols-outlined text-lg">compare_arrows</span>
          Compare ({items.length})
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-[#e8e8e8] z-10">
              <h2 className="font-['Playfair_Display'] font-bold text-lg text-black">Compare Products</h2>
              <button onClick={() => setOpen(false)} className="text-[#747878]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5">
              {/* Product cards row */}
              <div className={`grid gap-4 mb-6`} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
                {items.map(p => (
                  <div key={p.id} className="text-center">
                    <div className="aspect-square rounded-xl overflow-hidden mb-2 relative" style={{ background: "#f4f3f3" }}>
                      {p.imageUrl ? (
                        <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl text-[#c4c7c7]">checkroom</span>
                        </div>
                      )}
                      <button onClick={() => remove(p.id)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center shadow">
                        <span className="material-symbols-outlined text-sm text-[#747878]">close</span>
                      </button>
                    </div>
                    <p className="text-xs font-bold text-black leading-tight">{p.name}</p>
                  </div>
                ))}
              </div>

              {/* Comparison table */}
              <div className="divide-y divide-[#f4f3f3]">
                {ROWS.map(row => (
                  <div key={row.label} className="py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#c4c7c7] mb-2">{row.label}</p>
                    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
                      {items.map(p => (
                        <div key={p.id} className="text-sm">{row.render(p)}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Shop buttons */}
              <div className={`grid gap-3 mt-5`} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
                {items.map(p => (
                  <Link key={p.id} href={`/products/${p.slug}`}
                    onClick={() => setOpen(false)}
                    className="text-center py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{ background: "#12103a", color: "#faf7f0" }}>
                    View
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
