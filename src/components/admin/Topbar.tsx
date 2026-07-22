"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/admin/products?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 py-3.5 md:py-4 bg-canvas/96 backdrop-blur-xl border-b border-line">
      <h2 className="dd-display text-xl md:text-2xl text-fg truncate">
        {title}
      </h2>
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl w-60 bg-surface border border-line">
          <span className="material-symbols-outlined text-[18px] text-fg-subtle">search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full text-fg placeholder:text-fg-subtle"
            placeholder="Search products…"
          />
        </form>

        <button
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-surface text-fg-muted"
          onClick={() => router.push("/admin/products")}>
          <span className="material-symbols-outlined text-xl">search</span>
        </button>

        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-surface text-fg-muted">
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" style={{ boxShadow: "0 0 0 1.5px var(--canvas)" }} />
        </button>
      </div>
    </header>
  );
}
