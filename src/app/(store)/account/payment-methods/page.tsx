"use client";

import Link from "next/link";

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="dd-display text-[28px] text-fg">Payment Methods</h2>
        <p className="text-fg-muted text-[14px] mt-1">How you pay at checkout.</p>
      </div>

      {/* Info card */}
      <div className="bg-surface border border-line rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-accent-tint flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-accent">credit_card</span>
        </div>
        <h3 className="dd-display text-[22px] text-fg mb-2">
          Pay your way at checkout
        </h3>
        <p className="text-fg-muted text-[14px] max-w-sm mx-auto mb-6">
          We support card payments via Stripe and cash on delivery. Choose your preferred method each time you place an order.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {[
            { icon: "credit_card", label: "Card", color: "var(--accent)" },
            { icon: "local_shipping", label: "Cash on Delivery", color: "var(--fg-muted)" },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-raised border border-line">
              <span className="material-symbols-outlined text-[18px]" style={{ color: m.color }}>{m.icon}</span>
              <span className="text-[13px] font-medium" style={{ color: m.color }}>{m.label}</span>
            </div>
          ))}
        </div>

        <Link href="/shop"
          className="inline-block bg-accent text-accent-fg px-8 py-3 rounded-full text-[13px] font-medium hover:bg-accent-hover transition-colors">
          Start Shopping
        </Link>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 bg-surface-raised border border-line rounded-2xl p-4">
        <span className="material-symbols-outlined text-accent flex-shrink-0 mt-0.5">lock</span>
        <p className="text-[13px] text-fg-muted">
          All card transactions are processed by Stripe. We never store your card details.
        </p>
      </div>
    </div>
  );
}
