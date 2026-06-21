import { Suspense } from "react";
import ShopClient from "./ShopClient";

export const metadata = { title: "Shop All — Aura Goli" };

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <ShopClient />
    </Suspense>
  );
}
