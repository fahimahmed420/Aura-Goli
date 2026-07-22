"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const mainNav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/orders", label: "Orders", icon: "shopping_cart" },
  { href: "/admin/products", label: "Products", icon: "inventory_2" },
  { href: "/admin/customers", label: "Customers", icon: "group" },
  { href: "/admin/coupons", label: "Coupons", icon: "sell" },
  { href: "/admin/flash-sale", label: "Flash Sales", icon: "bolt" },
  { href: "/admin/size-chart", label: "Size Chart", icon: "straighten" },
  { href: "/admin/analytics", label: "Reports", icon: "analytics" },
];

const settingsNav = [
  { href: "/admin/settings", label: "Store Settings", icon: "settings" },
  { href: "/admin/security", label: "Security", icon: "lock" },
];

export default function Sidebar({ adminName }: { adminName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("adminToken");
    router.push("/admin/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  /* JSX value, not a component defined during render — a nested component
     gets a fresh identity each render and forces React to remount the whole
     nav subtree (losing scroll position and any focus inside it). */
  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="px-6 py-7 border-b border-white/8">
        <h1 className="dd-display text-xl text-fg">
          Aura<span className="text-accent"> Goli</span>
        </h1>
        <p className="text-[10px] mt-1 uppercase tracking-[0.3em]"
          style={{ color: "rgba(247,244,236,0.3)" }}>Admin Console</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 pb-2 overflow-y-auto space-y-0.5">
        {mainNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[13.5px] font-semibold"
              style={{
                background: active ? "rgba(201,168,76,0.12)" : "transparent",
                color: active ? "var(--accent)" : "rgba(247,244,236,0.5)",
                borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
              }}
            >
              <span className="material-symbols-outlined text-xl"
                style={{ color: active ? "var(--accent)" : "rgba(247,244,236,0.35)" }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              )}
            </Link>
          );
        })}

        <div className="px-4 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.28em]"
          style={{ color: "rgba(247,244,236,0.25)" }}>
          Configuration
        </div>

        {settingsNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[13.5px] font-semibold"
              style={{
                background: active ? "rgba(201,168,76,0.12)" : "transparent",
                color: active ? "var(--accent)" : "rgba(247,244,236,0.5)",
                borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
              }}
            >
              <span className="material-symbols-outlined text-xl"
                style={{ color: active ? "var(--accent)" : "rgba(247,244,236,0.35)" }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 mt-auto border-t border-white/8">
        <div className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: "rgba(247,244,236,0.04)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "rgba(201,168,76,0.15)", color: "var(--accent)", border: "1.5px solid rgba(201,168,76,0.25)" }}>
            {adminName?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="text-white text-sm font-semibold truncate leading-tight">{adminName ?? "Admin"}</p>
            <p className="text-[11px] truncate" style={{ color: "rgba(247,244,236,0.35)" }}>Admin Manager</p>
          </div>
          <button onClick={handleLogout}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: "rgba(247,244,236,0.35)" }}
            title="Logout">
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-60 hidden md:flex flex-col sticky top-0 h-screen z-50 flex-shrink-0"
        style={{
          background: "var(--canvas)",
          borderRight: "1px solid rgba(247,244,236,0.06)",
          boxShadow: "4px 0 24px rgba(11,11,20,0.3)",
        }}>
        {sidebarContent}
      </aside>

      {/* Mobile: top header with drawer trigger */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ background: "var(--canvas)", borderBottom: "1px solid rgba(247,244,236,0.08)" }}>
        <h1 className="dd-display text-lg text-fg">
          Aura<span className="text-accent"> Goli</span>
        </h1>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "rgba(247,244,236,0.06)", color: "rgba(247,244,236,0.7)" }}>
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(11,11,20,0.7)", backdropFilter: "blur(4px)" }} />
          <div
            className="absolute top-0 left-0 bottom-0 w-72 flex flex-col"
            style={{ background: "var(--canvas)", borderRight: "1px solid rgba(247,244,236,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/8">
              <h1 className="dd-display text-lg text-fg">
                Aura<span className="text-accent"> Goli</span>
              </h1>
              <button onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: "rgba(247,244,236,0.5)" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
