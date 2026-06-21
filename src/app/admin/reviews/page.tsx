"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface Review {
  id: string; rating: number; title: string | null; body: string;
  isApproved: boolean; createdAt: string;
  user: { name: string; email: string };
  product: { name: string; slug: string };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("adminToken");
    const params = new URLSearchParams({ page: String(page) });
    if (filter) params.set("approved", filter);
    const res = await fetch(`/api/admin/reviews?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setReviews(data.reviews ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function toggle(id: string, approve: boolean) {
    setActing(id);
    const token = localStorage.getItem("adminToken");
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isApproved: approve }),
    });
    fetchReviews();
    setActing(null);
  }

  async function del(id: string) {
    if (!confirm("Delete this review?")) return;
    setActing(id);
    const token = localStorage.getItem("adminToken");
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchReviews();
    setActing(null);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminShell title="Reviews">
      <div className="space-y-6">
        {/* Filter tabs */}
        <div className="flex items-center gap-1">
          {(["", "true", "false"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                filter === f ? "bg-black text-white" : "bg-white border border-[#c4c7c7] text-[#444748] hover:bg-[#f4f3f3]"
              }`}
            >
              {f === "" ? "All Reviews" : f === "true" ? "Approved" : "Pending"}
            </button>
          ))}
          <span className="ml-auto text-xs text-[#444748] uppercase tracking-widest">{total} reviews</span>
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white border border-[#c4c7c7] rounded-lg p-16 text-center text-[#747878] text-sm">
              No reviews found.
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="bg-white border border-[#c4c7c7] rounded-lg p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-sm ${i < r.rating ? "text-yellow-400" : "text-[#c4c7c7]"}`}>★</span>
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-black">{r.user.name}</span>
                      <span className="text-xs text-[#747878]">{r.user.email}</span>
                      <span className="text-xs text-[#747878]">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${r.isApproved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {r.isApproved ? "Approved" : "Pending"}
                      </span>
                    </div>
                    <p className="text-xs text-[#5951b4] font-semibold mb-2">On: {r.product.name}</p>
                    {r.title && <p className="font-semibold text-black text-sm mb-1">{r.title}</p>}
                    <p className="text-sm text-[#444748] leading-relaxed">{r.body}</p>
                  </div>

                  <div className="flex flex-shrink-0 gap-2">
                    {!r.isApproved ? (
                      <button
                        onClick={() => toggle(r.id, true)}
                        disabled={acting === r.id}
                        className="px-4 py-2 text-xs font-bold bg-black text-white uppercase tracking-widest hover:bg-[#5951b4] transition-colors disabled:opacity-40"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => toggle(r.id, false)}
                        disabled={acting === r.id}
                        className="px-4 py-2 text-xs font-bold border border-[#c4c7c7] text-[#444748] uppercase tracking-widest hover:bg-[#f4f3f3] transition-colors disabled:opacity-40"
                      >
                        Hide
                      </button>
                    )}
                    <button
                      onClick={() => del(r.id)}
                      disabled={acting === r.id}
                      className="px-4 py-2 text-xs font-bold bg-[#ffdad6] text-[#ba1a1a] uppercase tracking-widest hover:bg-[#ba1a1a] hover:text-white transition-colors disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#444748]">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border border-[#c4c7c7] text-sm disabled:opacity-40 hover:bg-[#f4f3f3]">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 border border-[#c4c7c7] text-sm disabled:opacity-40 hover:bg-[#f4f3f3]">Next</button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
