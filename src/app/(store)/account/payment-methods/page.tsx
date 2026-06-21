"use client";

import Link from "next/link";

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Playfair_Display'] text-[28px] font-semibold text-black">Payment Methods</h2>
        <p className="text-[#444748] text-[14px] mt-1">How you pay at checkout.</p>
      </div>

      {/* Info card */}
      <div className="bg-white border border-[#e8e8e8] rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f4f3f3] flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-[#5951b4]">credit_card</span>
        </div>
        <h3 className="font-['Playfair_Display'] text-[22px] font-semibold text-black mb-2">
          Pay your way at checkout
        </h3>
        <p className="text-[#444748] text-[14px] max-w-sm mx-auto mb-6">
          We support bKash, Nagad, Rocket, card, and cash on delivery. Choose your preferred method each time you place an order.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {[
            { icon: "account_balance_wallet", label: "bKash", color: "text-[#e2136e]", bg: "bg-[#fce4ef]" },
            { icon: "account_balance_wallet", label: "Nagad", color: "text-[#f7941d]", bg: "bg-[#fef3e2]" },
            { icon: "account_balance_wallet", label: "Rocket", color: "text-[#8b2fc9]", bg: "bg-[#f2e8fd]" },
            { icon: "credit_card", label: "Card", color: "text-[#5951b4]", bg: "bg-[#e4dfff]" },
            { icon: "local_shipping", label: "Cash on Delivery", color: "text-[#444748]", bg: "bg-[#eeeeee]" },
          ].map((m) => (
            <div key={m.label} className={`flex items-center gap-2 px-4 py-2.5 rounded-full ${m.bg}`}>
              <span className={`material-symbols-outlined text-[18px] ${m.color}`}>{m.icon}</span>
              <span className={`text-[13px] font-semibold ${m.color}`}>{m.label}</span>
            </div>
          ))}
        </div>

        <Link href="/shop"
          className="inline-block bg-black text-white px-8 py-3 rounded-full text-[13px] font-semibold hover:opacity-80 transition-opacity">
          Start Shopping
        </Link>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 bg-[#f4f3f3] border border-[#e8e8e8] rounded-2xl p-4">
        <span className="material-symbols-outlined text-[#5951b4] flex-shrink-0 mt-0.5">lock</span>
        <p className="text-[13px] text-[#444748]">
          All transactions are encrypted end-to-end via SSL Commerz. We never store your card details.
        </p>
      </div>
    </div>
  );
}
