import Nav from "@/components/storefront/Nav";
import Footer from "@/components/storefront/Footer";
import AuthProvider from "@/components/storefront/AuthProvider";
import WhatsAppButton from "@/components/storefront/WhatsAppButton";
import FlashSaleBanner from "@/components/storefront/FlashSaleBanner";
import ScrollToTop from "@/components/storefront/ScrollToTop";
import CartSync from "@/components/storefront/CartSync";
import { CompareProvider, CompareDrawer } from "@/components/storefront/CompareDrawer";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [{ maintenanceMode, storeName }, categories] = await Promise.all([
    getSettings(),
    // Seed the nav's category links server-side so all 6 links (Home, Shop
    // All, + 4 categories) are present on the very first paint, instead of
    // "Home / Shop All" rendering alone and the rest popping in once a
    // client-side fetch resolves — that pop-in was causing a layout shift
    // in the nav on every load.
    prisma.category.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" }, take: 5 }),
  ]);
  const name = storeName || "Aura Goli";

  return (
    <CompareProvider>
      <ScrollToTop />
      <CartSync />
      <AuthProvider>
        <FlashSaleBanner />
        <Nav storeName={name} initialCategories={categories} />
        <main className="flex-1">{children}</main>
        <CompareDrawer />
        <Footer />
        <WhatsAppButton />
      </AuthProvider>

      {maintenanceMode && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center text-center px-6 bg-canvas"
          style={{ backgroundImage: "radial-gradient(ellipse at 50% 0%, var(--accent-tint) 0%, transparent 60%)" }}
        >
          <div className="absolute w-96 h-96 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--accent-tint) 0%, transparent 70%)" }} />

          <div className="relative z-10 max-w-md">
            <p className="dd-display text-3xl mb-8 text-fg">
              {name}
            </p>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 bg-accent-tint border border-accent/30">
              <span className="material-symbols-outlined text-4xl text-accent">construction</span>
            </div>
            <h1 className="dd-display text-4xl md:text-5xl mb-4 leading-tight text-fg">
              We&apos;ll be<br />
              <span className="text-accent">back soon</span>
            </h1>
            <p className="text-base leading-relaxed mb-10 text-fg-muted">
              We&apos;re making some improvements to bring you a better experience.
              Please check back shortly.
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm bg-accent-tint border border-accent/20 text-accent">
              <span className="material-symbols-outlined text-base">mail</span>
              Contact us for urgent enquiries
            </div>
          </div>
        </div>
      )}
    </CompareProvider>
  );
}
