import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service | Aura Goli" };

const LAST_UPDATED = "1 June 2025";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <div className="bg-black text-white px-4 md:px-12 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-[#9f97ff] uppercase tracking-widest mb-3">Legal</p>
          <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-2">Terms of Service</h1>
          <p className="text-white/50 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-12 py-16">
        <div className="space-y-10 text-[#444748]">
          {[
            {
              title: "1. Acceptance of Terms",
              body: `By accessing or using the Aura Goli website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.`,
            },
            {
              title: "2. Use of the Website",
              body: `You agree to use this website only for lawful purposes and in a manner that does not infringe the rights of others. You must not use the site to transmit harmful, offensive, or illegal content, attempt to gain unauthorised access to our systems, or engage in any activity that disrupts the operation of the website.`,
            },
            {
              title: "3. Account Registration",
              body: `To access certain features, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorised use of your account.`,
            },
            {
              title: "4. Orders and Payment",
              body: `All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order. Prices are listed in Bangladeshi Taka (৳) and are subject to change without notice. Payment must be received in full before an order is processed.`,
            },
            {
              title: "5. Shipping and Delivery",
              body: `Delivery timelines are estimates only and are not guaranteed. We are not responsible for delays caused by courier services, customs, or circumstances beyond our control. Risk of loss and title for items pass to you upon delivery.`,
            },
            {
              title: "6. Returns and Refunds",
              body: `Our return and refund policy is described on the Returns page. By placing an order, you agree to the terms of that policy. Refunds are processed to the original payment method and may take 5–7 business days.`,
            },
            {
              title: "7. Intellectual Property",
              body: `All content on this website, including text, graphics, logos, images, and software, is the property of Aura Goli and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.`,
            },
            {
              title: "8. Product Descriptions",
              body: `We make every effort to display product colours and descriptions accurately. However, we cannot guarantee that your device's display will accurately reflect the actual product. We reserve the right to correct any errors and to change or update information without prior notice.`,
            },
            {
              title: "9. Limitation of Liability",
              body: `To the maximum extent permitted by law, Aura Goli shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our website or products. Our total liability shall not exceed the amount paid for the product giving rise to the claim.`,
            },
            {
              title: "10. Governing Law",
              body: `These Terms are governed by the laws of Bangladesh. Any disputes shall be subject to the exclusive jurisdiction of the courts of Dhaka, Bangladesh.`,
            },
            {
              title: "11. Changes to Terms",
              body: `We reserve the right to update these Terms at any time. Continued use of the website after changes are posted constitutes acceptance of the revised Terms.`,
            },
            {
              title: "12. Contact",
              body: `For questions about these Terms, contact us at hello@auragoli.com or write to: Aura Goli, Dhanmondi, Dhaka 1205, Bangladesh.`,
            },
          ].map((s) => (
            <section key={s.title}>
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-black mb-3">{s.title}</h2>
              <p className="leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
