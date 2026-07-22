"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

interface Variant {
  id: string; color: string | null; size: string | null; stockQuantity: number;
}
interface Product {
  id: string; name: string; slug: string; price: number; status: string;
  salesCount: number;
  category: { name: string } | null;
  images: { url: string }[];
  variants: Variant[];
}

function StockCell({ product, expanded, onToggle }: { product: Product; expanded: boolean; onToggle: () => void }) {
  const totalStock = product.variants.reduce((s, v) => s + v.stockQuantity, 0);
  const hasLow = product.variants.some((v) => v.stockQuantity > 0 && v.stockQuantity <= 5);
  const hasOOS = product.variants.some((v) => v.stockQuantity === 0);

  // Group variants by color
  const colors = [...new Set(product.variants.map((v) => v.color ?? "—"))];
  const sizes  = [...new Set(product.variants.map((v) => v.size  ?? "—"))];

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 hover:opacity-70 transition-opacity text-left"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${totalStock === 0 ? "bg-[color:var(--danger)]" : hasLow ? "bg-amber-500" : "bg-[color:var(--accent)]"}`} />
        <span className={totalStock === 0 ? "text-[color:var(--danger)] font-bold" : hasLow ? "text-amber-600 font-bold" : "text-[color:var(--fg-muted)]"}>
          {totalStock === 0 ? "Out of stock" : `${totalStock} units`}
        </span>
        <span className="material-symbols-outlined text-[14px] text-[color:var(--fg-subtle)]" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          expand_more
        </span>
      </button>
      {hasLow && totalStock > 0 && !expanded && (
        <p className="text-[10px] text-amber-600 mt-0.5">Low stock on some variants</p>
      )}

      {expanded && (
        <div className="mt-2 rounded-lg border border-[color:var(--line-strong)] overflow-hidden">
          <table className="text-[11px] w-full border-collapse">
            <thead>
              <tr className="bg-[color:var(--surface)]">
                <th className="px-2 py-1.5 text-left font-semibold text-[color:var(--fg-muted)] border-b border-[color:var(--line-strong)]">Color</th>
                {sizes.map((s) => (
                  <th key={s} className="px-2 py-1.5 text-center font-semibold text-[color:var(--fg-muted)] border-b border-[color:var(--line-strong)]">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--surface-raised)]">
              {colors.map((color) => (
                <tr key={color} className="hover:bg-[color:var(--canvas)]">
                  <td className="px-2 py-1.5 font-medium text-fg capitalize">{color}</td>
                  {sizes.map((size) => {
                    const v = product.variants.find((vv) => (vv.color ?? "—") === color && (vv.size ?? "—") === size);
                    const qty = v?.stockQuantity ?? null;
                    return (
                      <td key={size} className="px-2 py-1.5 text-center">
                        {qty === null ? (
                          <span className="text-[color:var(--fg-subtle)]">—</span>
                        ) : qty === 0 ? (
                          <span className="font-bold text-[color:var(--danger)]">0</span>
                        ) : qty <= 5 ? (
                          <span className="font-bold text-amber-600">{qty}</span>
                        ) : (
                          <span className="text-[color:var(--fg-muted)]">{qty}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const STATUS_CHIP: Record<string, string> = {
  active: "bg-[color:var(--accent-tint)] text-[color:var(--accent)]",
  draft: "bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)]",
  archived: "bg-[color:var(--surface-raised)] text-[color:var(--fg-muted)]",
};

function AdminProductsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedStock, setExpandedStock] = useState<Set<string>>(new Set());

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("adminToken");
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/products?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setProducts(data.products ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }, [page, q, category, status]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(id);
    const token = localStorage.getItem("adminToken");
    await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchProducts();
    setDeleting(null);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminShell title="Inventory Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[color:var(--fg-muted)]">Manage your catalog, stock levels, and publication status.</p>
          </div>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 bg-accent text-accent-fg px-6 py-3 rounded-lg font-semibold text-[13px] hover:opacity-80 transition-opacity"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add New Product
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-surface border border-[color:var(--fg-subtle)] rounded-lg p-4 flex flex-wrap items-center gap-4 high-fashion-shadow">
          <div className="flex items-center gap-2 border-b border-[color:var(--fg-subtle)] py-1">
            <span className="material-symbols-outlined text-[color:var(--fg-muted)] text-lg">search</span>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-[color:var(--fg-subtle)]"
              placeholder="Search products..."
            />
          </div>
          <div className="flex items-center gap-2 border-b border-[color:var(--fg-subtle)] py-1">
            <span className="material-symbols-outlined text-[color:var(--fg-muted)] text-lg">filter_list</span>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="border-none bg-transparent outline-none text-sm text-fg"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 border-b border-[color:var(--fg-subtle)] py-1">
            <span className="material-symbols-outlined text-[color:var(--fg-muted)] text-lg">info</span>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="border-none bg-transparent outline-none text-sm text-fg"
            >
              <option value="">Status: All</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <span className="ml-auto text-xs text-[color:var(--fg-muted)] uppercase tracking-widest">
            Showing {total} Products
          </span>
        </div>

        {/* Table */}
        <div className="bg-surface border border-[color:var(--fg-subtle)] rounded-lg high-fashion-shadow overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-[color:var(--surface)] border-b border-[color:var(--fg-subtle)]">
                <tr>
                  {["Product", "Category", "Price", "Stock", "Sales", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-4 text-xs font-semibold text-[color:var(--fg-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line-strong)]">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center">
                    <div className="w-6 h-6 border-2 border-line-strong border-t-transparent rounded-full animate-spin mx-auto" />
                  </td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-[color:var(--fg-subtle)] text-sm">No products found.</td></tr>
                ) : products.map((p) => (
                  <tr key={p.id} className="hover:bg-[color:var(--surface)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          <img src={p.images[0].url} alt={p.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-[color:var(--line-strong)] rounded flex items-center justify-center">
                            <span className="material-symbols-outlined text-[color:var(--fg-subtle)] text-lg">image</span>
                          </div>
                        )}
                        <span className="text-sm font-semibold text-fg max-w-[200px] truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[color:var(--fg-muted)]">{p.category?.name ?? "—"}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-fg">৳{Number(p.price).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <StockCell
                        product={p}
                        expanded={expandedStock.has(p.id)}
                        onToggle={() => setExpandedStock((prev) => {
                          const next = new Set(prev);
                          next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                          return next;
                        })}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-[color:var(--fg-muted)]">{p.salesCount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_CHIP[p.status] ?? "bg-gray-100"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="text-[color:var(--accent)] hover:text-[color:var(--accent)] transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </Link>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          disabled={deleting === p.id}
                          className="text-[color:var(--danger)] hover:text-[color:var(--danger)] transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[color:var(--fg-subtle)]">
              <p className="text-sm text-[color:var(--fg-muted)]">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-[color:var(--fg-subtle)] text-sm disabled:opacity-40 hover:bg-[color:var(--surface)] transition-colors"
                >Prev</button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-[color:var(--fg-subtle)] text-sm disabled:opacity-40 hover:bg-[color:var(--surface)] transition-colors"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense>
      <AdminProductsInner />
    </Suspense>
  );
}
