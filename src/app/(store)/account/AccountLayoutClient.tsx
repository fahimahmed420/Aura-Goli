"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/storefront/AuthProvider";
import AuraLoadingScreen from "@/components/ui/AuraLoadingScreen";

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
  // Session is resolved once, globally, by AuthProvider (store layout).
  const { user, resolving } = useAuth();
  const name = user?.name ?? "";
  const avatarUrl = user?.avatarUrl ?? null;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Once the session has resolved and there's still no user, this is a
  // protected route — bounce to login.
  useEffect(() => {
    if (!resolving && !user) router.replace("/login?next=" + pathname);
  }, [resolving, user, router, pathname]);

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

  // Keep the branded loader up until we've confirmed a user — covers both the
  // session-resolving window and the brief moment before the redirect fires.
  if (resolving || !user) {
    return <AuraLoadingScreen fullScreen />;
  }

  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      {/* ── Page wrapper ── */}
      <div className="min-h-screen bg-canvas" style={{ paddingTop: 64 }}>
        <div className="max-w-6xl mx-auto px-4 md:px-10 pt-3 pb-6 md:py-10">
          <div className="flex flex-col md:grid md:grid-cols-4 gap-6 md:gap-8">

            {/* ── Desktop sidebar (hidden on mobile) ── */}
            <aside className="hidden md:block md:col-span-1">
              {/* Identity card */}
              <div className="rounded-2xl p-5 mb-4 flex items-center gap-3 bg-surface border border-line">
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0 bg-accent-tint text-accent border-2 border-accent/30" style={{ fontSize: "1rem" }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    : initials}
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-fg text-sm truncate">{name}</p>
                  <p className="text-[11px] text-fg-subtle">Member</p>
                </div>
              </div>

              {/* Nav links */}
              <nav className="rounded-2xl overflow-hidden bg-surface border border-line">
                {NAV.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-5 py-4 text-[14px] font-medium border-b border-line transition-all ${
                        active ? "bg-accent-tint text-accent border-l-2 border-l-accent" : "text-fg-muted border-l-2 border-l-transparent"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: active ? "var(--accent)" : "var(--fg-subtle)", fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  onClick={() => { fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); localStorage.removeItem("ag_authed"); window.dispatchEvent(new Event("user-updated")); router.push("/"); }}
                  className="w-full flex items-center gap-3 px-5 py-4 text-[14px] font-medium transition-colors border-l-2 border-l-transparent"
                  style={{ color: "var(--danger)" }}
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
          background: "var(--overlay)",
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
          background: "var(--canvas)",
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
        <div style={{ height: 2, background: "linear-gradient(90deg, var(--accent) 0%, transparent 100%)", flexShrink: 0 }} />

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
                style={{ background: active ? "var(--accent-tint)" : "transparent" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: active ? "var(--accent-tint)" : "rgba(247,244,236,0.05)",
                    border: active ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(247,244,236,0.06)",
                  }}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ color: active ? "var(--accent)" : "rgba(247,244,236,0.45)", fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                </div>
                <span className="text-[14px] font-medium" style={{ color: active ? "var(--accent)" : "rgba(247,244,236,0.7)" }}>
                  {item.label}
                </span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-8 pt-2 shrink-0" style={{ borderTop: "1px solid rgba(247,244,236,0.06)" }}>
          <Link
            href="/shop"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl mb-1 transition-all"
            style={{ background: "var(--accent-tint)" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--accent-tint)", border: "1px solid rgba(201,168,76,0.2)" }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--accent)" }}>storefront</span>
            </div>
            <span className="text-[14px] font-medium" style={{ color: "var(--accent)" }}>Back to Shop</span>
          </Link>

          <button
            onClick={() => { fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); localStorage.removeItem("ag_authed"); window.dispatchEvent(new Event("user-updated")); router.push("/"); }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all hover:bg-white/5"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--danger-tint)", border: "1px solid rgba(186,26,26,0.15)" }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--danger)" }}>logout</span>
            </div>
            <span className="text-[14px] font-medium" style={{ color: "var(--danger)" }}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
