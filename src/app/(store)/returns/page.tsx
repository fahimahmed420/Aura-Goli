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
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Header */}
      <div className="bg-black text-white px-4 md:px-12 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-[#9f97ff] uppercase tracking-widest mb-3">Hassle-Free</p>
          <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-4">Returns & Exchanges</h1>
          <p className="text-white/70 max-w-xl">We want you to love your Aura Goli pieces. If something isn&apos;t right, we make it easy to return or exchange.</p>
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
            <div key={c.title} className="bg-white border border-[#c4c7c7] rounded-xl p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-[#5951b4] mb-3 block">{c.icon}</span>
              <h3 className="font-semibold text-black mb-1">{c.title}</h3>
              <p className="text-sm text-[#444748]">{c.body}</p>
            </div>
          ))}
        </div>

        {/* Process */}
        <div>
          <h2 className="font-['Playfair_Display'] text-3xl font-bold text-black mb-10">How It Works</h2>
          <div className="space-y-6">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-6 items-start bg-white border border-[#c4c7c7] rounded-xl p-6">
                <span className="font-['Playfair_Display'] text-3xl font-bold text-[#c4c7c7] flex-shrink-0 leading-none">{s.n}</span>
                <div>
                  <h3 className="font-semibold text-black mb-1">{s.title}</h3>
                  <p className="text-sm text-[#444748] leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eligibility */}
        <div className="bg-white border border-[#c4c7c7] rounded-xl p-8">
          <h2 className="font-['Playfair_Display'] text-2xl font-bold text-black mb-6">Return Eligibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-black flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-green-600 text-xl">check_circle</span>
                Eligible for Return
              </h3>
              <ul className="space-y-2 text-sm text-[#444748]">
                {["Unworn and unwashed items", "Original tags attached", "Original packaging intact", "Within 14 days of delivery", "Full-price items"].map((i) => (
                  <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />{i}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-black flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#ba1a1a] text-xl">cancel</span>
                Not Eligible
              </h3>
              <ul className="space-y-2 text-sm text-[#444748]">
                {["Sale or discounted items", "Items showing signs of wear", "Items without tags", "Returns after 14 days", "Items damaged by misuse"].map((i) => (
                  <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] flex-shrink-0" />{i}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-[#444748] mb-6">Ready to return or have a question?</p>
          <Link href="/contact" className="inline-block bg-black text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#5951b4] transition-colors">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
