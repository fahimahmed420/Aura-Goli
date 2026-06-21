"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/account/profile", icon: "person", label: "Profile" },
  { href: "/account/orders", icon: "receipt_long", label: "Orders" },
  { href: "/account/loyalty", icon: "stars", label: "Loyalty Points" },
  { href: "/account/wishlist", icon: "favorite", label: "Wishlist" },
  { href: "/account/addresses", icon: "location_on", label: "Addresses" },
  { href: "/account/payment-methods", icon: "credit_card", label: "Payments" },
  { href: "/account/referral", icon: "share", label: "Refer & Earn" },
];

export default function AccountLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) { router.replace("/login?next=" + pathname); return; }

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) { localStorage.removeItem("userToken"); router.replace("/login?next=" + pathname); return null; }
        return r.json();
      })
      .then((d) => { if (d) { setName(d.user?.name ?? ""); setAvatarUrl(d.user?.avatarUrl ?? null); setChecking(false); } })
      .catch(() => router.replace("/login?next=" + pathname));
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#f9f9f9" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#e8e8e8] border-t-[#0b0b14] animate-spin" />
          <p className="text-sm text-[#747878]">Loading your account…</p>
        </div>
      </div>
    );
  }

  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen" style={{ background: "#f4f3f3" }}>

      {/* ── Mobile sticky header: identity + tabs ─────────────── */}
      <div className="md:hidden sticky top-16 z-30" style={{ background: "#0b0b14" }}>
        {/* Identity row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c", border: "1.5px solid rgba(201,168,76,0.3)" }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : initials}
          </div>
          <p className="text-sm font-semibold text-white">{name}</p>
        </div>
        {/* Tab bar */}
        <div className="flex overflow-x-auto scrollbar-none">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold whitespace-nowrap shrink-0 border-b-2 transition-all"
                style={{
                  borderColor: active ? "#c9a84c" : "transparent",
                  color: active ? "#c9a84c" : "rgba(255,255,255,0.45)",
                }}>
                <span className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => { localStorage.removeItem("userToken"); router.push("/"); }}
            className="flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold whitespace-nowrap shrink-0 border-b-2 border-transparent ml-auto"
            style={{ color: "rgba(255,100,100,0.7)" }}>
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-10">
        <div className="flex flex-col md:grid md:grid-cols-4 gap-6 md:gap-8">

          {/* ── Desktop sidebar ───────────────────────────────── */}
          <aside className="hidden md:block md:col-span-1">
            {/* Identity card */}
            <div className="rounded-2xl p-5 mb-4 flex items-center gap-3"
              style={{ background: "#0b0b14", boxShadow: "0 8px 28px rgba(11,11,20,0.18)" }}>
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0"
                style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "2px solid rgba(201,168,76,0.3)", fontSize: "1rem" }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-white text-sm truncate">{name}</p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Member</p>
              </div>
            </div>

            <nav className="rounded-2xl overflow-hidden"
              style={{ background: "white", boxShadow: "0 4px 16px rgba(11,11,20,0.06)" }}>
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-3 px-5 py-4 text-[14px] font-medium border-b transition-all"
                    style={{
                      borderColor: "#f4f3f3",
                      background: active ? "#0b0b14" : "transparent",
                      color: active ? "#faf7f0" : "#444748",
                      borderLeft: active ? "3px solid #c9a84c" : "3px solid transparent",
                    }}>
                    <span className="material-symbols-outlined text-[20px]"
                      style={{ color: active ? "#c9a84c" : "#747878" }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => { localStorage.removeItem("userToken"); router.push("/"); }}
                className="w-full flex items-center gap-3 px-5 py-4 text-[14px] font-medium transition-colors"
                style={{ color: "#ba1a1a", borderLeft: "3px solid transparent" }}>
                <span className="material-symbols-outlined text-[20px]">logout</span>
                Logout
              </button>
            </nav>
          </aside>

          {/* Content */}
          <main className="md:col-span-3">{children}</main>
        </div>
      </div>

    </div>
  );
}
