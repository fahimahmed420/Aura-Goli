"use client";

import { useEffect, useState } from "react";

interface ReferralData {
  referralCode: string | null;
  referredCount: number;
  referralUrl: string | null;
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    fetch("/api/account/referral", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function copyLink() {
    if (!data?.referralUrl) return;
    navigator.clipboard.writeText(data.referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 rounded-full border-2 border-[#e8e8e8] border-t-[#0b0b14] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-['Playfair_Display'] text-2xl font-bold" style={{ color: "#0b0b14" }}>
          Refer &amp; Earn
        </h1>
        <p className="text-sm mt-1" style={{ color: "#747878" }}>
          Share your referral link and earn rewards when friends join.
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-2xl p-6" style={{ background: "#0b0b14" }}>
        <h2 className="font-['Playfair_Display'] text-lg font-semibold mb-4" style={{ color: "#faf7f0" }}>
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "share", step: "1", title: "Share your link", desc: "Send your unique referral link to friends." },
            { icon: "person_add", step: "2", title: "Friend signs up", desc: "They create an account using your link." },
            { icon: "sell", step: "3", title: "Both get rewarded", desc: "They get 10% off, you get ৳100 off your next order." },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-start gap-2 rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(201,168,76,0.2)" }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: "#c9a84c" }}>{item.icon}</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: "#faf7f0" }}>{item.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(250,247,240,0.5)" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral code card */}
      <div className="rounded-2xl p-6 bg-white" style={{ boxShadow: "0 4px 16px rgba(11,11,20,0.06)" }}>
        <h2 className="font-['Playfair_Display'] text-lg font-semibold mb-4" style={{ color: "#0b0b14" }}>
          Your Referral Link
        </h2>

        {data?.referralCode ? (
          <>
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#747878" }}>
                Your code
              </p>
              <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2"
                style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)" }}>
                <span className="font-mono font-bold text-base tracking-widest" style={{ color: "#0b0b14" }}>
                  {data.referralCode}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#747878" }}>
                Shareable link
              </p>
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm break-all"
                style={{ background: "#f4f3f3", color: "#444748" }}>
                {data.referralUrl}
              </div>
            </div>

            <button
              onClick={copyLink}
              className="flex items-center gap-2 rounded-2xl px-5 py-3 text-[11px] font-bold uppercase tracking-widest transition-all"
              style={{
                background: copied ? "#16a34a" : "#0b0b14",
                color: "#faf7f0",
                boxShadow: "0 4px 0 rgba(0,0,0,0.3)",
              }}
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                {copied ? "check_circle" : "content_copy"}
              </span>
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </>
        ) : (
          <p className="text-sm" style={{ color: "#747878" }}>
            No referral code found. Please contact support.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 bg-white" style={{ boxShadow: "0 4px 16px rgba(11,11,20,0.06)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#747878" }}>
            Friends Referred
          </p>
          <p className="font-['Playfair_Display'] text-3xl font-bold" style={{ color: "#0b0b14" }}>
            {data?.referredCount ?? 0}
          </p>
        </div>
        <div className="rounded-2xl p-5 bg-white" style={{ boxShadow: "0 4px 16px rgba(11,11,20,0.06)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#747878" }}>
            Rewards Earned
          </p>
          <p className="font-['Playfair_Display'] text-3xl font-bold" style={{ color: "#c9a84c" }}>
            {data?.referredCount ?? 0}
          </p>
          <p className="text-xs mt-1" style={{ color: "#747878" }}>coupon{(data?.referredCount ?? 0) !== 1 ? "s" : ""} issued</p>
        </div>
      </div>
    </div>
  );
}
