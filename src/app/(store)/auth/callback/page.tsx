"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const token = sp.get("token");
    const next = sp.get("next") ?? "/account/orders";
    if (token) {
      localStorage.setItem("userToken", token);
      window.dispatchEvent(new Event("user-updated"));
    }
    router.replace(next);
  }, [router, sp]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0b0b14" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#c9a84c] rounded-full animate-spin" />
        <p className="text-sm font-medium" style={{ color: "rgba(250,247,240,0.5)" }}>Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0b0b14" }}>
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#c9a84c] rounded-full animate-spin" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
