"use client";

import { useState } from "react";

const FAQS = [
  {
    category: "Orders & Shipping",
    items: [
      { q: "How long does shipping take?", a: "Standard delivery within Bangladesh takes 3–5 business days. Dhaka metropolitan orders are typically delivered in 1–2 business days." },
      { q: "Do you offer free shipping?", a: "Yes! Orders above ৳2,000 qualify for free shipping. Orders below that threshold incur a flat ৳100 shipping fee." },
      { q: "Can I track my order?", a: "Absolutely. Once your order is dispatched, you'll receive a tracking link via email. You can also track it anytime at /order-tracking using your order number." },
      { q: "Can I change or cancel my order?", a: "Orders can be changed or cancelled within 1 hour of placement. After that, they enter fulfillment and cannot be modified. Contact us immediately at hello@auragoli.com." },
    ],
  },
  {
    category: "Returns & Exchanges",
    items: [
      { q: "What is your return policy?", a: "We accept returns within 14 days of delivery for unworn, unwashed items with original tags attached. Sale items are final sale." },
      { q: "How do I start a return?", a: "Visit our Returns page or email hello@auragoli.com with your order number. We'll guide you through the process and arrange a pickup." },
      { q: "When will I receive my refund?", a: "Refunds are processed within 5–7 business days of receiving your return. The amount is credited back to your original payment method." },
      { q: "Can I exchange for a different size?", a: "Yes, exchanges are free of charge for size changes within 14 days. Subject to stock availability." },
    ],
  },
  {
    category: "Products & Sizing",
    items: [
      { q: "How do I find my size?", a: "We recommend consulting our Size Chart on each product page. Aura Goli pieces are cut to standard Bangladesh/Asian sizing. When in doubt, size up for an oversized fit." },
      { q: "What fabric are your T-shirts made from?", a: "Our core range is crafted from 100% Supima cotton (180–220 GSM). Premium and Signature lines use blended fabrics — details are listed on each product page." },
      { q: "How should I care for my Aura Goli pieces?", a: "Machine wash cold, inside out, on a gentle cycle. Avoid tumble drying — lay flat or hang dry to preserve shape and print quality." },
    ],
  },
  {
    category: "Payments",
    items: [
      { q: "What payment methods do you accept?", a: "We accept all major credit/debit cards (via Stripe) and Cash on Delivery for orders within Dhaka." },
      { q: "Is it safe to pay online?", a: "Yes. All card transactions are processed by Stripe, a PCI DSS Level 1 certified payment processor. We never store your card details." },
      { q: "Can I use a promo code?", a: "Yes! Enter your promo code at checkout in the 'Promo Code' field. Codes are case-insensitive. Only one code per order." },
    ],
  },
];

export default function FAQClient() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-line px-4 md:px-12 py-16 text-center">
        <p className="dd-eyebrow text-fg-subtle uppercase tracking-widest mb-3">Support</p>
        <h1 className="dd-display text-4xl md:text-5xl text-fg mb-4">Frequently Asked Questions</h1>
        <p className="text-fg-muted max-w-lg mx-auto">Everything you need to know. Can&apos;t find an answer? We&apos;re here to help.</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-12 py-16 space-y-12">
        {FAQS.map((section) => (
          <div key={section.category}>
            <h2 className="dd-display text-2xl text-fg mb-6 pb-3 border-b border-line">
              {section.category}
            </h2>
            <div className="space-y-2">
              {section.items.map((item) => {
                const id = `${section.category}-${item.q}`;
                const isOpen = open === id;
                return (
                  <div key={item.q} className="bg-surface border border-line rounded-lg overflow-hidden">
                    <button
                      onClick={() => setOpen(isOpen ? null : id)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left"
                    >
                      <span className="text-sm font-medium text-fg pr-4">{item.q}</span>
                      <span className={`material-symbols-outlined text-accent flex-shrink-0 transition-transform ${isOpen ? "rotate-45" : ""}`}>
                        add
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5">
                        <p className="text-sm text-fg-muted leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Still need help */}
        <div className="bg-surface border border-line rounded-xl p-8 text-center text-fg">
          <h3 className="dd-display text-2xl mb-3">Still have questions?</h3>
          <p className="text-fg-muted mb-6 text-sm">Our team is available Sunday–Thursday, 10am–6pm BST.</p>
          <a href="/contact" className="inline-block bg-accent text-accent-fg px-8 py-3 text-xs font-medium uppercase tracking-widest hover:bg-accent-hover transition-colors">
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}
