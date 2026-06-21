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
];

export default function AccountLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Close drawer on route change and notify Nav to revert icon
  useEffect(() => {
    setDrawerOpen(false);
    window.dispatchEvent(new Event("account-drawer-closed"));
  }, [pathname]);

  // Open/close drawer from Nav's account hamburger
  useEffect(() => {
    const onOpen = () => setDrawerOpen(true);
    const onClose = () => setDrawerOpen(false);
    window.addEventListener("open-account-drawer", onOpen);
    window.addEventListener("close-account-drawer", onClose);
    return () => {
      window.removeEventListener("open-account-drawer", onOpen);
      window.removeEventListener("close-account-drawer", onClose);
    };
  }, []);

  // Lock body scroll when drawer is open (mobile only)
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#0b0b14", zIndex: 100 }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-t-[#c9a84c] border-r-[#c9a84c] border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-sm font-medium tracking-widest uppercase" style={{ color: "rgba(250,247,240,0.4)" }}>
            Loading
          </p>
        </div>
      </div>
    );
  }

  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      {/* ── Page wrapper ── */}
      <div className="min-h-screen" style={{ paddingTop: 64, background: "#f4f3f3" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-10 pt-3 pb-6 md:py-10">
          <div className="flex flex-col md:grid md:grid-cols-4 gap-6 md:gap-8">

            {/* ── Desktop sidebar (hidden on mobile) ── */}
            <aside className="hidden md:block md:col-span-1">
              {/* Identity card */}
              <div
                className="rounded-2xl p-5 mb-4 flex items-center gap-3"
                style={{ background: "#0b0b14", boxShadow: "0 8px 28px rgba(11,11,20,0.18)" }}
              >
                <div
                  className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0"
                  style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "2px solid rgba(201,168,76,0.3)", fontSize: "1rem" }}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    : initials}
                </div>
                <div className="overflow-hidden">
                  <p className="font-semibold text-white text-sm truncate">{name}</p>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Member</p>
                </div>
              </div>

              {/* Nav links */}
              <nav
                className="rounded-2xl overflow-hidden"
                style={{ background: "white", boxShadow: "0 4px 16px rgba(11,11,20,0.06)" }}
              >
                {NAV.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-5 py-4 text-[14px] font-medium border-b transition-all"
                      style={{
                        borderColor: "#f4f3f3",
                        background: active ? "#0b0b14" : "transparent",
                        color: active ? "#faf7f0" : "#444748",
                        borderLeft: active ? "3px solid #c9a84c" : "3px solid transparent",
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: active ? "#c9a84c" : "#747878", fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  onClick={() => { localStorage.removeItem("userToken"); router.push("/"); }}
                  className="w-full flex items-center gap-3 px-5 py-4 text-[14px] font-medium transition-colors"
                  style={{ color: "#ba1a1a", borderLeft: "3px solid transparent" }}
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Logout
                </button>
              </nav>
            </aside>

            {/* ── Content ── */}
            <main className="md:col-span-3">{children}</main>
          </div>
        </div>
      </div>

      {/* ── Mobile backdrop (md:hidden so it never shows on desktop) ── */}
      <div
        onClick={() => { setDrawerOpen(false); window.dispatchEvent(new Event("account-drawer-closed")); }}
        aria-hidden="true"
        className="md:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 70,
          background: "rgba(11,11,20,0.5)",
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "opacity 0.32s ease",
        }}
      />

      {/* ── Mobile drawer (md:hidden) ── */}
      <aside
        className="md:hidden"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 80,
          width: "min(320px, 88vw)",
          background: "#0b0b14",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
          transform: drawerOpen ? "translate3d(0,0,0)" : "translate3d(105%,0,0)",
          visibility: drawerOpen ? "visible" : "hidden",
          transition: drawerOpen
            ? "transform 0.35s cubic-bezier(0.4,0,0.2,1), visibility 0s"
            : "transform 0.35s cubic-bezier(0.4,0,0.2,1), visibility 0s 0.35s",
          willChange: "transform",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Gold accent */}
        <div style={{ height: 2, background: "linear-gradient(90deg, #c9a84c 0%, transparent 100%)", flexShrink: 0 }} />

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3" style={{ overscrollBehavior: "contain" }}>
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-4 mx-3 px-4 py-3.5 rounded-xl transition-all duration-200"
                style={{ background: active ? "rgba(201,168,76,0.1)" : "transparent" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: active ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.05)",
                    border: active ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ color: active ? "#c9a84c" : "rgba(250,247,240,0.45)", fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                </div>
                <span className="text-[14px] font-medium" style={{ color: active ? "#c9a84c" : "rgba(250,247,240,0.7)" }}>
                  {item.label}
                </span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#c9a84c" }} />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-8 pt-2 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Link
            href="/shop"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl mb-1 transition-all"
            style={{ background: "rgba(201,168,76,0.06)" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.2)" }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: "#c9a84c" }}>storefront</span>
            </div>
            <span className="text-[14px] font-medium" style={{ color: "#c9a84c" }}>Back to Shop</span>
          </Link>

          <button
            onClick={() => { localStorage.removeItem("userToken"); router.push("/"); }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all hover:bg-white/5"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(186,26,26,0.1)", border: "1px solid rgba(186,26,26,0.15)" }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: "#ba1a1a" }}>logout</span>
            </div>
            <span className="text-[14px] font-medium" style={{ color: "rgba(186,26,26,0.8)" }}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
