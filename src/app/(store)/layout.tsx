import Nav from "@/components/storefront/Nav";
import Footer from "@/components/storefront/Footer";
import WhatsAppButton from "@/components/storefront/WhatsAppButton";
import FlashSaleBanner from "@/components/storefront/FlashSaleBanner";
import ScrollToTop from "@/components/storefront/ScrollToTop";
import CartSync from "@/components/storefront/CartSync";
import { CompareProvider, CompareDrawer } from "@/components/storefront/CompareDrawer";
import { getSettings } from "@/lib/settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { maintenanceMode, storeName } = await getSettings();
  const name = storeName || "Aura Goli";

  return (
    <CompareProvider>
      <ScrollToTop />
      <CartSync />
      <FlashSaleBanner />
      <Nav storeName={name} />
      <main className="flex-1">{children}</main>
      <CompareDrawer />
      <Footer />
      <WhatsAppButton />

      {maintenanceMode && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center text-center px-6"
          style={{
            background: "#0b0b14",
            backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.15) 0%, transparent 60%)",
          }}
        >
          <div className="absolute w-96 h-96 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(201,168,76,0.5) 0%, transparent 70%)" }} />

          <div className="relative z-10 max-w-md">
            <p className="font-['Playfair_Display'] text-3xl font-bold mb-8" style={{ color: "#faf7f0" }}>
              {name}
            </p>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
              style={{ background: "rgba(201,168,76,0.1)", border: "1.5px solid rgba(201,168,76,0.3)" }}>
              <span className="material-symbols-outlined text-4xl" style={{ color: "#c9a84c" }}>construction</span>
            </div>
            <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-4 leading-tight"
              style={{ color: "#faf7f0" }}>
              We&apos;ll be<br />
              <span style={{ color: "#c9a84c" }}>back soon</span>
            </h1>
            <p className="text-base leading-relaxed mb-10" style={{ color: "rgba(250,247,240,0.5)" }}>
              We&apos;re making some improvements to bring you a better experience.
              Please check back shortly.
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm"
              style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c" }}>
              <span className="material-symbols-outlined text-base">mail</span>
              Contact us for urgent enquiries
            </div>
          </div>
        </div>
      )}
    </CompareProvider>
  );
}
