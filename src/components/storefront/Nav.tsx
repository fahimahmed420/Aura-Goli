"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

interface User { name: string; email: string; avatarUrl?: string | null; }
interface Category { id: string; name: string; slug: string; }


export default function Nav({ storeName = "Aura Goli" }: { storeName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
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
    const updateUser = async () => {
      const t = localStorage.getItem("ag_authed");
      if (!t) { setUser(null); return; }
      try {
        const r = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } });
        if (r.ok) { const d = await r.json(); setUser(d.user); }
        else { localStorage.removeItem("ag_authed"); setUser(null); }
      } catch { /* offline */ }
    };
    const updateCart = () => {
      try {
        const c = JSON.parse(localStorage.getItem("cart") ?? "[]");
        setCartCount(c.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0));
      } catch { setCartCount(0); }
    };
    updateUser();
    updateCart();
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories?.slice(0, 5) ?? []));

    window.addEventListener("user-updated", updateUser);
    window.addEventListener("cart-updated", updateCart);
    return () => {
      window.removeEventListener("user-updated", updateUser);
      window.removeEventListener("cart-updated", updateCart);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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
        className={`fixed inset-x-0 z-50 ${isAccountPage ? "" : "transition-[background,backdrop-filter,border-color,box-shadow] duration-300"}`}
        style={{
          top: "0",
          background: isTransparent ? "transparent" : "rgba(11,11,20,0.96)",
          backdropFilter: isTransparent ? "none" : "blur(20px)",
          WebkitBackdropFilter: isTransparent ? "none" : "blur(20px)",
          zIndex: isAccountPage && accountDrawerOpen ? 90 : 50,
          borderBottom: (isTransparent || isAccountPage) ? "none" : "1px solid rgba(255,255,255,0.07)",
          boxShadow: (isTransparent || isAccountPage) ? "none" : "0 4px 24px rgba(11,11,20,0.5)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center gap-4">

          {/* Logo — AG mark + wordmark lockup */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2 font-['Playfair_Display'] text-xl font-bold tracking-tight"
            style={{ color: "#faf7f0" }}>
            <Image src="/logo-mark.png" alt={storeName} width={26} height={28} priority className="h-7 w-auto" />
            <span>
              {storeName.includes(" ") ? (
                <>{storeName.split(" ")[0]}<span style={{ color: "#c9a84c" }}> {storeName.split(" ").slice(1).join(" ")}</span></>
              ) : storeName}
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-hidden">
            {navLinks.map((l) => {
              const active = isActive(l);
              return (
                <Link key={l.href} href={l.href}
                  className="px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap"
                  style={{
                    color: active ? "#c9a84c" : "rgba(255,255,255,0.65)",
                    background: active ? "rgba(201,168,76,0.12)" : "transparent",
                    fontWeight: active ? 700 : 500,
                  }}>
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Search — desktop only */}
            <button onClick={() => setSearchOpen(true)}
              className="hidden md:flex w-10 h-10 items-center justify-center rounded-full transition-all"
              style={{ color: "rgba(255,255,255,0.7)" }} aria-label="Search">
              <span className="material-symbols-outlined text-xl">search</span>
            </button>

            {/* Cart — desktop only */}
            <Link href="/cart"
              className="hidden md:flex relative w-10 h-10 items-center justify-center rounded-full transition-all"
              style={{ color: "rgba(255,255,255,0.7)" }} aria-label="Cart">
              <span className="material-symbols-outlined text-xl">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1"
                  style={{ background: "#c9a84c", color: "#0b0b14" }}>
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* Account name + avatar + drawer trigger — mobile account pages only */}
            {isAccountPage && (
              <>
                {user && (
                  <>
                    <span className="md:hidden text-sm font-medium max-w-[80px] truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {user.name.split(" ")[0]}
                    </span>
                    <div className="md:hidden w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: "rgba(201,168,76,0.18)", color: "#c9a84c", border: "1.5px solid rgba(201,168,76,0.3)" }}>
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt="" width={36} height={36} decoding="async" className="w-full h-full object-cover" />
                        : user.name.charAt(0).toUpperCase()}
                    </div>
                  </>
                )}
                <button
                  className="md:hidden w-10 h-10 flex items-center justify-center rounded-full transition-all"
                  style={{ color: "rgba(255,255,255,0.7)" }}
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
              <Link href="/account/profile"
                className="w-10 h-10 flex items-center justify-center rounded-full overflow-hidden transition-all"
                style={{
                  background: user ? "rgba(201,168,76,0.18)" : "transparent",
                  color: user ? "#c9a84c" : "rgba(255,255,255,0.7)",
                }}>
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} width={40} height={40} decoding="async" className="w-full h-full object-cover" />
                ) : user ? (
                  <span className="text-sm font-bold">{userInitial}</span>
                ) : (
                  <span className="material-symbols-outlined text-xl">person</span>
                )}
              </Link>

              {/* Dropdown — pt-2 creates an invisible bridge over the gap */}
              <div className="absolute right-0 top-10 pt-2 w-52 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200"
                style={{ zIndex: 60 }}>
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "#12103a", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 50px rgba(11,11,20,0.7)" }}>
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-white/8">
                        <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                        <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{user.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { href: "/account/profile", label: "Profile", icon: "person" },
                          { href: "/account/orders", label: "My Orders", icon: "receipt_long" },
                          { href: "/account/addresses", label: "Addresses", icon: "location_on" },
                        ].map((item) => (
                          <Link key={item.href} href={item.href}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/6"
                            style={{ color: "rgba(255,255,255,0.65)" }}>
                            <span className="material-symbols-outlined text-base">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="py-1 border-t border-white/8">
                        <button onClick={logout}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/6 transition-colors">
                          <span className="material-symbols-outlined text-base">logout</span>
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 space-y-2">
                      <Link href={`/login?next=${encodeURIComponent(pathname)}`}
                        className="flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
                        style={{ background: "#c9a84c", color: "#0b0b14" }}>
                        Sign In
                      </Link>
                      <Link href={`/login?next=${encodeURIComponent(pathname)}&mode=register`}
                        className="flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
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
          <div className="absolute inset-0" style={{ background: "rgba(11,11,20,0.85)", backdropFilter: "blur(10px)" }} />
          <form onSubmit={handleSearch} className="relative w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 rounded-2xl px-5 py-4"
              style={{ background: "#12103a", border: "1.5px solid rgba(201,168,76,0.4)", boxShadow: "0 24px 60px rgba(11,11,20,0.8)" }}>
              <span className="material-symbols-outlined text-2xl" style={{ color: "#c9a84c" }}>search</span>
              <input ref={searchRef} value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search for threads, styles, colors…"
                className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder:text-white/30" />
              <button type="button" onClick={() => setSearchOpen(false)} style={{ color: "rgba(255,255,255,0.4)" }}>
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
          <div className="relative flex items-center justify-around rounded-[32px]"
            style={{
              height: "60px",
              background: "rgba(11,11,20,0.92)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
              overflow: "visible",
            }}>
            {([
              { type: "link", href: "/", label: "Home", icon: "home" },
              { type: "link", href: "/shop", label: "Shop", icon: "storefront" },
              { type: "action", label: "Search", icon: "search" },
              { type: "link", href: "/cart", label: "Bag", icon: "shopping_bag", badge: cartCount },
              { type: "link", href: user ? "/account/profile" : `/login?next=${encodeURIComponent(pathname)}`, label: user ? "Account" : "Sign In", icon: user ? "person" : "login" },
            ] as ({ type: "link"; href: string; label: string; icon: string; badge?: number } | { type: "action"; label: string; icon: string })[]).map((item) => {
              const active = item.type === "action"
                ? searchOpen
                : (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
              const inner = (
                <>
                  {active ? (
                    <>
                      <span className="absolute flex items-center justify-center rounded-full"
                        style={{
                          width: "54px", height: "54px", bottom: "32px", left: "50%",
                          transform: "translateX(-50%)",
                          background: "linear-gradient(145deg, #d4b05a 0%, #c9a84c 50%, #b8942e 100%)",
                          boxShadow: "0 4px 20px rgba(201,168,76,0.45), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
                        }}>
                        {"badge" in item && item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold px-[3px]"
                            style={{ background: "#ba1a1a", color: "white", boxShadow: "0 0 0 2px #0b0b14" }}>
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                        <span className="material-symbols-outlined"
                          style={{ fontSize: "24px", color: "#0b0b14", fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>
                          {item.icon}
                        </span>
                      </span>
                      <span className="absolute bottom-[7px] text-[9px] font-bold tracking-wider uppercase"
                        style={{ color: "#c9a84c", letterSpacing: "0.07em" }}>
                        {item.label}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="relative">
                        <span className="material-symbols-outlined"
                          style={{ fontSize: "22px", color: "rgba(255,255,255,0.55)", fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                          {item.icon}
                        </span>
                        {"badge" in item && item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] flex items-center justify-center rounded-full text-[9px] font-bold px-[2px]"
                            style={{ background: "#ba1a1a", color: "white", boxShadow: "0 0 0 1.5px #0b0b14" }}>
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] font-medium mt-0.5"
                        style={{ color: "rgba(255,255,255,0.62)", letterSpacing: "0.04em" }}>
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
