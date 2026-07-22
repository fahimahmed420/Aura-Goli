import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Returns & Exchanges | Aura Goli" };

const steps = [
  { n: "01", title: "Initiate Your Return", body: "Email hello@auragoli.com with your order number and reason for return within 14 days of delivery." },
  { n: "02", title: "Pack Your Items", body: "Repack the item(s) in their original packaging with tags attached. Include a note with your order number inside." },
  { n: "03", title: "Schedule Pickup", body: "We'll arrange a free courier pickup from your address. You'll receive a confirmation with a pickup window." },
  { n: "04", title: "Receive Your Refund", body: "Once we inspect and accept the return, your refund is processed within 5–7 business days to your original payment method." },
];

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-line px-4 md:px-12 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="dd-eyebrow text-fg-subtle uppercase tracking-widest mb-3">Hassle-Free</p>
          <h1 className="dd-display text-4xl md:text-5xl text-fg mb-4">Returns & Exchanges</h1>
          <p className="text-fg-muted max-w-xl">We want you to love your Aura Goli pieces. If something isn&apos;t right, we make it easy to return or exchange.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-12 py-16 space-y-16">
        {/* Policy summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "calendar_month", title: "14-Day Window", body: "Returns accepted within 14 days of delivery." },
            { icon: "local_shipping", title: "Free Pickup", body: "We arrange and cover courier pickup costs." },
            { icon: "payments", title: "Full Refund", body: "Refunded to your original payment method." },
          ].map((c) => (
            <div key={c.title} className="bg-surface border border-line rounded-xl p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-accent mb-3 block">{c.icon}</span>
              <h3 className="font-medium text-fg mb-1">{c.title}</h3>
              <p className="text-sm text-fg-muted">{c.body}</p>
            </div>
          ))}
        </div>

        {/* Process */}
        <div>
          <h2 className="dd-display text-3xl text-fg mb-10">How It Works</h2>
          <div className="space-y-6">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-6 items-start bg-surface border border-line rounded-xl p-6">
                <span className="dd-display text-3xl text-fg-subtle flex-shrink-0 leading-none">{s.n}</span>
                <div>
                  <h3 className="font-medium text-fg mb-1">{s.title}</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eligibility */}
        <div className="bg-surface border border-line rounded-xl p-8">
          <h2 className="dd-display text-2xl text-fg mb-6">Return Eligibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-medium text-fg flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-green-600 text-xl">check_circle</span>
                Eligible for Return
              </h3>
              <ul className="space-y-2 text-sm text-fg-muted">
                {["Unworn and unwashed items", "Original tags attached", "Original packaging intact", "Within 14 days of delivery", "Full-price items"].map((i) => (
                  <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />{i}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-fg flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[color:var(--danger)] text-xl">cancel</span>
                Not Eligible
              </h3>
              <ul className="space-y-2 text-sm text-fg-muted">
                {["Sale or discounted items", "Items showing signs of wear", "Items without tags", "Returns after 14 days", "Items damaged by misuse"].map((i) => (
                  <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[color:var(--danger)] flex-shrink-0" />{i}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-fg-muted mb-6">Ready to return or have a question?</p>
          <Link href="/contact" className="inline-block bg-accent text-accent-fg px-10 py-4 text-xs font-medium uppercase tracking-widest hover:bg-accent-hover transition-colors">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
