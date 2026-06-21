"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminCallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const token = sp.get("token");
    if (token) {
      localStorage.setItem("adminToken", token);
    }
    router.replace("/admin/dashboard");
  }, [router, sp]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1b1b]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-sm font-medium text-white/50">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AdminAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#1c1b1b]">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <AdminCallbackInner />
    </Suspense>
  );
}
