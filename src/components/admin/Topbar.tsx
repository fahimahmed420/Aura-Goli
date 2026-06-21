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
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 py-3.5 md:py-4"
      style={{
        background: "rgba(249,249,249,0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid #e8e8e8",
        boxShadow: "0 2px 12px rgba(11,11,20,0.05)",
      }}
    >
      <h2 className="font-['Playfair_Display'] text-xl md:text-2xl font-semibold text-black truncate">
        {title}
      </h2>
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl w-60"
          style={{ background: "#f4f3f3", border: "1px solid #e8e8e8" }}>
          <span className="material-symbols-outlined text-[18px] text-[#747878]">search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full text-black placeholder:text-[#c4c7c7]"
            placeholder="Search products…"
          />
        </form>

        <button
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "#f4f3f3", color: "#444748" }}
          onClick={() => router.push("/admin/products")}>
          <span className="material-symbols-outlined text-xl">search</span>
        </button>

        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "#f4f3f3", color: "#444748" }}>
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "#5951b4", boxShadow: "0 0 0 1.5px #f9f9f9" }} />
        </button>
      </div>
    </header>
  );
}
