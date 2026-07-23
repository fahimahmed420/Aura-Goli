"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/storefront/AuthProvider";

interface Category { id: string; name: string; slug: string; }


export default function Nav({ storeName = "Aura Goli", initialCategories = [] }: { storeName?: string; initialCategories?: Category[] }) {
  const pathname = usePathname();
  const router = useRouter();
  // Auth is owned by AuthProvider (store layout), which gates the page with a
  // full-screen loader until the session resolves — so by the time the nav is
  // visible, `user` is already correct and there is no signed-out flash.
  const { user } = useAuth();
  const showAsAuthed = !!user;
  const [cartCount, setCartCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  // Seeded from the server so the full link set (incl. category links) is
  // present on first paint — avoids a layout shift where "Home / Shop All"
  // render alone and 4 more links pop in once the client fetch resolves.
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const searchRef = useRef<HTMLInputElement>(null);

  const isHome = pathname === "/";
  const isAccountPage = pathname.startsWith("/account");
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);

  // Sync icon state when drawer is closed from inside AccountLayoutClient
  useEffect(() => {
    const handler = () => setAccountDrawerOpen(false);
    window.addEventListener("account-drawer-closed", handler);
    return () => window.removeEventListener("account-drawer-closed", handler);
  }, []);

  useEffect(() => {
    const updateCart = () => {
      try {
        const c = JSON.parse(localStorage.getItem("cart") ?? "[]");
        setCartCount(c.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0));
      } catch { setCartCount(0); }
    };
    updateCart();
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories?.slice(0, 5) ?? []));

    window.addEventListener("cart-updated", updateCart);
    return () => {
      window.removeEventListener("cart-updated", updateCart);
    };
  }, []);

  useEffect(() => {
    // Hysteresis (enter solid later than we exit it) so hovering right at a
    // single threshold — e.g. "scroll down a bit then back up" — doesn't
    // retrigger the transparent/solid toggle on every pixel of scroll.
    const onScroll = () => {
      setScrolled((prev) => (prev ? window.scrollY > 20 : window.scrollY > 60));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQ.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQ.trim())}`);
      setSearchOpen(false);
      setSearchQ("");
    }
  }

  function logout() {
    // Clear the server-side HttpOnly cookies, then drop the local flag.
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("ag_authed");
    window.dispatchEvent(new Event("user-updated"));
    router.push("/");
  }

  // Read search params for active category detection
  const [searchParamCategory, setSearchParamCategory] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchParamCategory(params.get("category") ?? "");
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Home", exact: true, categorySlug: "" },
    { href: "/shop", label: "Shop All", exact: false, categorySlug: "__none__" },
    ...categories.map((c) => ({ href: `/shop?category=${c.slug}`, label: c.name, exact: false, categorySlug: c.slug })),
  ];

  function isActive(link: { href: string; exact: boolean; categorySlug: string }) {
    // "Shop All" — active only on /shop with no category filter
    if (link.categorySlug === "__none__") {
      return pathname === "/shop" && !searchParamCategory;
    }
    // Category links — active when /shop + matching category param
    if (link.categorySlug) {
      return pathname === "/shop" && searchParamCategory === link.categorySlug;
    }
    // Home — exact
    if (link.exact) return pathname === "/";
    return pathname.startsWith(link.href);
  }

  const isTransparent = isHome && !scrolled;

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <>
      {/* ── Top bar ───────────────────────────────────────────── */}
      <header
        data-store-nav
        className="fixed inset-x-0 z-50"
        style={{
          top: "0",
          zIndex: isAccountPage && accountDrawerOpen ? 90 : 50,
        }}
      >
        {/*
          Backdrop layer, separated from content, and deliberately WITHOUT
          backdrop-filter: blurring the backdrop over the WebGL hero canvas
          hits a Chromium compositing bug where the sampled backdrop resolves
          to solid white — and the filter keeps painting even at opacity 0 —
          which turned the bar cream and made the cream nav text invisible
          after scrolling down then back up. At 96% opaque the frosted-glass
          blur was imperceptible anyway, so a plain background loses nothing.
        */}
        <div
          aria-hidden
          className={`absolute inset-0 ${isAccountPage ? "" : "transition-opacity duration-300"}`}
          style={{
            opacity: isTransparent ? 0 : 1,
            background: "var(--canvas)",
            borderBottom: isAccountPage ? "none" : "1px solid var(--line)",
          }}
        />
        <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center gap-4">

          {/* Logo — AG mark + wordmark lockup */}
          <Link href="/" className="dd-display flex items-center gap-2 shrink-0 mr-2 text-xl text-fg">
            <Image src="/logo-mark.png" alt={storeName} width={26} height={28} priority className="h-7 w-auto" />
            <span>
              {storeName.includes(" ") ? (
                <>{storeName.split(" ")[0]}<span className="text-accent"> {storeName.split(" ").slice(1).join(" ")}</span></>
              ) : storeName}
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-hidden">
            {navLinks.map((l) => {
              const active = isActive(l);
              return (
                <Link key={l.href} href={l.href}
                  className={`px-3.5 py-2 rounded-[var(--radius-pill)] text-sm transition-colors duration-200 whitespace-nowrap ${
                    active ? "text-accent font-semibold bg-accent-tint" : "text-fg-muted font-medium hover:text-fg"
                  }`}>
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Search — desktop only */}
            <button onClick={() => setSearchOpen(true)}
              className="hidden md:flex w-10 h-10 items-center justify-center rounded-full text-fg-muted hover:text-fg transition-colors" aria-label="Search">
              <span className="material-symbols-outlined text-xl">search</span>
            </button>

            {/* Cart — desktop only */}
            <Link href="/cart"
              className="hidden md:flex relative w-10 h-10 items-center justify-center rounded-full text-fg-muted hover:text-fg transition-colors" aria-label="Cart">
              <span className="material-symbols-outlined text-xl">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1 bg-accent text-accent-fg">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* Account name + avatar + drawer trigger — mobile account pages only */}
            {isAccountPage && (
              <>
                {user && (
                  <>
                    <span className="md:hidden text-sm font-medium max-w-[80px] truncate text-fg-muted">
                      {user.name.split(" ")[0]}
                    </span>
                    <div className="md:hidden w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold shrink-0 bg-accent-tint text-accent border border-accent/30">
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt="" width={36} height={36} decoding="async" className="w-full h-full object-cover" />
                        : user.name.charAt(0).toUpperCase()}
                    </div>
                  </>
                )}
                <button
                  className="md:hidden w-10 h-10 flex items-center justify-center rounded-full text-fg-muted"
                  aria-label="Account menu"
                  onClick={() => {
                    if (accountDrawerOpen) {
                      setAccountDrawerOpen(false);
                      window.dispatchEvent(new Event("close-account-drawer"));
                    } else {
                      setAccountDrawerOpen(true);
                      window.dispatchEvent(new Event("open-account-drawer"));
                    }
                  }}
                >
                  {/* Animated menu ↔ close icon */}
                  <span style={{ position: "relative", width: 22, height: 22, display: "inline-block" }}>
                    <span className="material-symbols-outlined text-xl" style={{
                      position: "absolute", inset: 0,
                      transition: "opacity 0.22s ease, transform 0.28s ease",
                      opacity: accountDrawerOpen ? 0 : 1,
                      transform: accountDrawerOpen ? "rotate(-45deg) scale(0.6)" : "rotate(0deg) scale(1)",
                    }}>menu</span>
                    <span className="material-symbols-outlined text-xl" style={{
                      position: "absolute", inset: 0,
                      transition: "opacity 0.22s ease, transform 0.28s ease",
                      opacity: accountDrawerOpen ? 1 : 0,
                      transform: accountDrawerOpen ? "rotate(0deg) scale(1)" : "rotate(45deg) scale(0.6)",
                    }}>close</span>
                  </span>
                </button>
              </>
            )}

            {/* Account dropdown (desktop) */}
            <div className="hidden md:block relative group">
              {/* Trigger */}
              <Link href={showAsAuthed ? "/account/profile" : `/login?next=${encodeURIComponent(pathname)}`}
                aria-label={showAsAuthed ? "Account" : "Sign in"}
                className={`w-10 h-10 flex items-center justify-center rounded-full overflow-hidden transition-all ${
                  showAsAuthed ? "bg-accent-tint text-accent" : "text-fg-muted"
                }`}>
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} width={40} height={40} decoding="async" className="w-full h-full object-cover" />
                ) : user ? (
                  <span className="text-sm font-bold">{userInitial}</span>
                ) : showAsAuthed ? (
                  <span className="material-symbols-outlined text-xl">person</span>
                ) : (
                  <span className="material-symbols-outlined text-xl">login</span>
                )}
              </Link>

              {/* Dropdown — pt-2 creates an invisible bridge over the gap */}
              <div className="absolute right-0 top-10 pt-2 w-52 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200"
                style={{ zIndex: 60 }}>
                <div className="rounded-[var(--radius-card)] overflow-hidden bg-surface border border-line">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-line">
                        <p className="text-xs font-semibold text-fg truncate">{user.name}</p>
                        <p className="text-[11px] truncate text-fg-subtle">{user.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { href: "/account/profile", label: "Profile", icon: "person" },
                          { href: "/account/orders", label: "My Orders", icon: "receipt_long" },
                          { href: "/account/addresses", label: "Addresses", icon: "location_on" },
                        ].map((item) => (
                          <Link key={item.href} href={item.href}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg-muted hover:bg-surface-raised hover:text-fg transition-colors">
                            <span className="material-symbols-outlined text-base">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="py-1 border-t border-line">
                        <button onClick={logout}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-raised transition-colors"
                          style={{ color: "var(--danger)" }}>
                          <span className="material-symbols-outlined text-base">logout</span>
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : showAsAuthed ? (
                    <div className="px-4 py-6 text-center text-xs text-fg-subtle">Loading…</div>
                  ) : (
                    <div className="p-3 space-y-2">
                      <Link href={`/login?next=${encodeURIComponent(pathname)}`}
                        className="flex items-center justify-center w-full py-2.5 rounded-[var(--radius-pill)] text-sm font-semibold uppercase tracking-wider transition-colors bg-accent text-accent-fg hover:bg-accent-hover">
                        Sign In
                      </Link>
                      <Link href={`/login?next=${encodeURIComponent(pathname)}&mode=register`}
                        className="flex items-center justify-center w-full py-2.5 rounded-[var(--radius-pill)] text-sm font-medium text-fg-muted border border-line hover:text-fg transition-colors">
                        Register
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ── Search overlay ────────────────────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          role="dialog" aria-modal="true" aria-label="Search products"
          onKeyDown={(e) => { if (e.key === "Escape") setSearchOpen(false); }}
          onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0" style={{ background: "var(--overlay)" }} />
          <form onSubmit={handleSearch} className="relative w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 rounded-[var(--radius-card)] px-5 py-4 bg-surface border border-line-strong">
              <span className="material-symbols-outlined text-2xl text-accent">search</span>
              <input ref={searchRef} value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search for threads, styles, colors…"
                className="flex-1 bg-transparent border-none outline-none text-lg text-fg placeholder:text-fg-subtle" />
              <button type="button" onClick={() => setSearchOpen(false)} className="text-fg-subtle">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* Extra top padding creates room for bubble to overflow upward */}
        <div className="px-4 pb-3" style={{ paddingTop: "30px" }}>
          {/* The pill bar */}
          {/* No backdrop-filter here either — same WebGL-canvas compositing bug as the top bar */}
          <div className="relative flex items-center justify-around rounded-[32px] bg-surface border border-line"
            style={{ height: "60px", overflow: "visible" }}>
            {([
              { type: "link", href: "/", label: "Home", icon: "home" },
              { type: "link", href: "/shop", label: "Shop", icon: "storefront" },
              { type: "action", label: "Search", icon: "search" },
              { type: "link", href: "/cart", label: "Bag", icon: "shopping_bag", badge: cartCount },
              { type: "link", href: showAsAuthed ? "/account/profile" : `/login?next=${encodeURIComponent(pathname)}`, label: showAsAuthed ? "Account" : "Sign In", icon: showAsAuthed ? "person" : "login" },
            ] as ({ type: "link"; href: string; label: string; icon: string; badge?: number } | { type: "action"; label: string; icon: string })[]).map((item) => {
              const active = item.type === "action"
                ? searchOpen
                : (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
              const inner = (
                <>
                  {active ? (
                    <>
                      <span className="absolute flex items-center justify-center rounded-full bg-accent"
                        style={{ width: "54px", height: "54px", bottom: "32px", left: "50%", transform: "translateX(-50%)" }}>
                        {"badge" in item && item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold px-[3px]"
                            style={{ background: "var(--danger)", color: "white", boxShadow: "0 0 0 2px var(--canvas)" }}>
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                        <span className="material-symbols-outlined text-accent-fg"
                          style={{ fontSize: "24px", fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>
                          {item.icon}
                        </span>
                      </span>
                      <span className="absolute bottom-[7px] text-[9px] font-bold tracking-wider uppercase text-accent">
                        {item.label}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="relative">
                        <span className="material-symbols-outlined text-fg-muted"
                          style={{ fontSize: "22px", fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                          {item.icon}
                        </span>
                        {"badge" in item && item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] flex items-center justify-center rounded-full text-[9px] font-bold px-[2px]"
                            style={{ background: "var(--danger)", color: "white", boxShadow: "0 0 0 1.5px var(--canvas)" }}>
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] font-medium mt-0.5 text-fg-subtle">
                        {item.label}
                      </span>
                    </>
                  )}
                </>
              );
              if (item.type === "action") {
                return (
                  <button key={item.label}
                    onClick={() => setSearchOpen(true)}
                    className="relative flex flex-col items-center justify-center active:scale-90 transition-transform duration-150"
                    style={{ width: "20%", height: "100%" }}>
                    {inner}
                  </button>
                );
              }
              return (
                <Link key={item.href} href={item.href}
                  className="relative flex flex-col items-center justify-center active:scale-90 transition-transform duration-150"
                  style={{ width: "20%", height: "100%" }}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Spacer — matches the fixed 64px (h-16) header so content never tucks under it */}
      {!isHome && <div className="h-16" />}
    </>
  );
}
