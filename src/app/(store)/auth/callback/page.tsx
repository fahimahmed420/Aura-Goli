"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    // The access token is now set server-side as an HttpOnly cookie during the
    // OAuth callback — it is no longer passed in the URL. Reaching this page means
    // sign-in succeeded, so just record the non-sensitive flag and continue.
    const next = sp.get("next") ?? "/account/orders";
    localStorage.setItem("ag_authed", "1");
    window.dispatchEvent(new Event("user-updated"));
    router.replace(next);
  }, [router, sp]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-line-strong border-t-accent rounded-full animate-spin" />
        <p className="text-sm font-medium text-fg-subtle">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-10 h-10 border-2 border-line-strong border-t-accent rounded-full animate-spin" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
