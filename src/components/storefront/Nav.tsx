"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface User { name: string; email: string; avatarUrl?: string | null; }
interface Category { id: string; name: string; slug: string; }

const DISMISS_KEY = "ag_flash_dismissed_until";

export default function Nav({ storeName = "Aura Goli" }: { storeName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bannerVisible, setBannerVisible] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const isHome = pathname === "/";

  useEffect(() => {
    const updateUser = async () => {
      const t = localStorage.getItem("userToken");
      if (!t) { setUser(null); return; }
      try {
        const r = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } });
        if (r.ok) { const d = await r.json(); setUser(d.user); }
        else { localStorage.removeItem("userToken"); setUser(null); }
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

    // Track whether the flash banner is visible so we can push nav down
    const checkBanner = () => {
      const until = localStorage.getItem(DISMISS_KEY);
      const suppressed = until && Date.now() < Number(until);
      if (suppressed) { setBannerVisible(false); return; }
      fetch("/api/flash-sale")
        .then(r => r.ok ? r.json() : null)
        .then(d => setBannerVisible(!!(d?.sale)))
        .catch(() => setBannerVisible(false));
    };
    checkBanner();

    window.addEventListener("user-updated", updateUser);
    window.addEventListener("cart-updated", updateCart);
    window.addEventListener("flash-banner-dismissed", () => setBannerVisible(false));
    return () => {
      window.removeEventListener("user-updated", updateUser);
      window.removeEventListener("cart-updated", updateCart);
      window.removeEventListener("flash-banner-dismissed", () => setBannerVisible(false));
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
    localStorage.removeItem("userToken");
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

  const isTransparent = isHome && !scrolled && !menuOpen;

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <>
      {/* ── Top bar ───────────────────────────────────────────── */}
      <header
        className="fixed inset-x-0 z-50 transition-all duration-300"
        style={{
          top: bannerVisible ? "2.5rem" : "0",
          background: isTransparent ? "transparent" : "rgba(11,11,20,0.96)",
          backdropFilter: isTransparent ? "none" : "blur(20px)",
          WebkitBackdropFilter: isTransparent ? "none" : "blur(20px)",
          borderBottom: isTransparent ? "none" : "1px solid rgba(255,255,255,0.07)",
          boxShadow: isTransparent ? "none" : "0 4px 24px rgba(11,11,20,0.5)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center gap-4">

          {/* Logo */}
          <Link href="/" className="font-['Playfair_Display'] text-xl font-bold tracking-tight shrink-0 mr-2"
            style={{ color: "#faf7f0" }}>
            {storeName.includes(" ") ? (
              <>{storeName.split(" ")[0]}<span style={{ color: "#c9a84c" }}> {storeName.split(" ").slice(1).join(" ")}</span></>
            ) : storeName}
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
            {/* Search */}
            <button onClick={() => setSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-all"
              style={{ color: "rgba(255,255,255,0.7)" }} aria-label="Search">
              <span className="material-symbols-outlined text-xl">search</span>
            </button>

            {/* Cart */}
            <Link href="/cart"
              className="relative w-10 h-10 flex items-center justify-center rounded-full transition-all"
              style={{ color: "rgba(255,255,255,0.7)" }} aria-label="Cart">
              <span className="material-symbols-outlined text-xl">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1"
                  style={{ background: "#c9a84c", color: "#0b0b14" }}>
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

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
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
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

            {/* Hamburger (mobile) */}
            <button onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full transition-all"
              style={{ color: "rgba(255,255,255,0.7)" }} aria-label="Menu">
              <span className="material-symbols-outlined text-xl">{menuOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(11,11,20,0.7)", backdropFilter: "blur(4px)" }} />
          <div className="absolute top-16 left-0 right-0 rounded-b-3xl overflow-hidden"
            style={{ background: "#12103a", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((l) => {
                const active = isActive(l);
                return (
                  <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors"
                    style={{
                      color: active ? "#c9a84c" : "rgba(255,255,255,0.75)",
                      background: active ? "rgba(201,168,76,0.1)" : "transparent",
                    }}>
                    {l.label}
                  </Link>
                );
              })}
              <hr className="border-white/8 my-2" />
              {user ? (
                <>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden shrink-0"
                      style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c" }}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : userInitial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{user.name}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{user.email}</p>
                    </div>
                  </div>
                  {[
                    { href: "/account/profile", icon: "person", label: "Profile" },
                    { href: "/account/orders", icon: "receipt_long", label: "My Orders" },
                    { href: "/account/wishlist", icon: "favorite", label: "Wishlist" },
                    { href: "/account/addresses", icon: "location_on", label: "Addresses" },
                  ].map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors"
                      style={{ color: "rgba(255,255,255,0.7)" }}>
                      <span className="material-symbols-outlined text-base">{item.icon}</span> {item.label}
                    </Link>
                  ))}
                  <button onClick={() => { logout(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400">
                    <span className="material-symbols-outlined text-base">logout</span> Sign Out
                  </button>
                </>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(pathname)}`} onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 mx-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest btn-gold">
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Search overlay ────────────────────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
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
      {/* ── Bottom Nav: floating bubble style ── */}
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
              { href: "/", label: "Home", icon: "home" },
              { href: "/shop", label: "Shop", icon: "storefront" },
              { href: "/cart", label: "Bag", icon: "shopping_bag", badge: cartCount },
              { href: user ? "/account/profile" : `/login?next=${encodeURIComponent(pathname)}`, label: user ? "Account" : "Sign In", icon: user ? "person" : "login" },
            ] as { href: string; label: string; icon: string; badge?: number }[]).map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className="relative flex flex-col items-center justify-center active:scale-90 transition-transform duration-150"
                  style={{ width: "25%", height: "100%" }}>

                  {active ? (
                    <>
                      {/* Floating bubble — rises 28px above the bar */}
                      <span className="absolute flex items-center justify-center rounded-full"
                        style={{
                          width: "54px",
                          height: "54px",
                          bottom: "32px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "linear-gradient(145deg, #d4b05a 0%, #c9a84c 50%, #b8942e 100%)",
                          boxShadow: "0 4px 20px rgba(201,168,76,0.45), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
                        }}>
                        {/* Badge on bubble */}
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold"
                            style={{ background: "#ba1a1a", color: "white", boxShadow: "0 0 0 2px #0b0b14", padding: "0 3px" }}>
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                        <span className="material-symbols-outlined"
                          style={{
                            fontSize: "24px",
                            color: "#0b0b14",
                            fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24",
                          }}>
                          {item.icon}
                        </span>
                      </span>
                      {/* Label inside bar */}
                      <span className="absolute bottom-[7px] text-[9px] font-bold tracking-wider uppercase"
                        style={{ color: "#c9a84c", letterSpacing: "0.07em" }}>
                        {item.label}
                      </span>
                    </>
                  ) : (
                    <>
                      {/* Normal icon */}
                      <span className="relative">
                        <span className="material-symbols-outlined"
                          style={{
                            fontSize: "22px",
                            color: "rgba(255,255,255,0.35)",
                            fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
                          }}>
                          {item.icon}
                        </span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] flex items-center justify-center rounded-full text-[9px] font-bold"
                            style={{ background: "#ba1a1a", color: "white", boxShadow: "0 0 0 1.5px #0b0b14", padding: "0 2px" }}>
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] font-medium mt-0.5"
                        style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
                        {item.label}
                      </span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Spacer */}
      {!isHome && <div className="h-24" />}
    </>
  );
}
