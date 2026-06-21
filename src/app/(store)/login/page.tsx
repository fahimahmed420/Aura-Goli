import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata = { title: "Sign In | Aura Goli" };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginClient />
    </Suspense>
  );
}
