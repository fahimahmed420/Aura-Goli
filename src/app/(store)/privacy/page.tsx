import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy | Aura Goli" };

const LAST_UPDATED = "1 June 2025";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-surface border-b border-line px-4 md:px-12 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="dd-eyebrow text-fg-subtle uppercase tracking-widest mb-3">Legal</p>
          <h1 className="dd-display text-4xl md:text-5xl text-fg mb-2">Privacy Policy</h1>
          <p className="text-fg-subtle text-sm">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-12 py-16 prose prose-sm max-w-none">
        <div className="space-y-10 text-fg-muted">
          {[
            {
              title: "1. Information We Collect",
              body: `We collect information you provide directly to us, such as your name, email address, phone number, shipping address, and payment information when you create an account or make a purchase. We also automatically collect certain information about your device and how you interact with our website, including IP address, browser type, pages viewed, and referring URLs.`,
            },
            {
              title: "2. How We Use Your Information",
              body: `We use the information we collect to process your orders, send order confirmations and shipping updates, respond to your enquiries, send promotional communications (with your consent), improve our website and services, comply with legal obligations, and detect and prevent fraudulent transactions.`,
            },
            {
              title: "3. Sharing Your Information",
              body: `We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website (such as payment processors, courier services, and email providers), subject to confidentiality obligations. We may also disclose information when required by law.`,
            },
            {
              title: "4. Payment Security",
              body: `All payment transactions are processed through SSLCommerz, a PCI-DSS compliant payment gateway. We do not store your card details on our servers. Payment data is encrypted using industry-standard SSL technology.`,
            },
            {
              title: "5. Cookies",
              body: `We use cookies and similar tracking technologies to enhance your experience, remember your preferences, and understand how our website is used. You can control cookie settings through your browser preferences. Note that disabling certain cookies may affect website functionality.`,
            },
            {
              title: "6. Data Retention",
              body: `We retain your personal information for as long as necessary to fulfil the purposes outlined in this policy, comply with legal obligations, resolve disputes, and enforce our agreements. Account information is retained for the duration of your account and for a reasonable period after closure.`,
            },
            {
              title: "7. Your Rights",
              body: `You have the right to access, correct, or delete your personal data. You may also object to processing, request data portability, or withdraw consent where processing is based on consent. To exercise any of these rights, please contact us at hello@auragoli.com.`,
            },
            {
              title: "8. Children's Privacy",
              body: `Our website is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.`,
            },
            {
              title: "9. Changes to This Policy",
              body: `We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.`,
            },
            {
              title: "10. Contact Us",
              body: `If you have any questions about this Privacy Policy, please contact us at: Aura Goli, Dhanmondi, Dhaka 1205, Bangladesh. Email: hello@auragoli.com. Phone: +880 1700-000000.`,
            },
          ].map((s) => (
            <section key={s.title}>
              <h2 className="dd-display text-xl text-fg mb-3">{s.title}</h2>
              <p className="leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
