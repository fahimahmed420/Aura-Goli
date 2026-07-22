import { Suspense } from "react";
import ShopClient from "./ShopClient";
import Spinner from "@/components/ui/Spinner";

export const metadata = { title: "Shop All — Aura Goli" };

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] bg-canvas"><Spinner /></div>}>
      <ShopClient />
    </Suspense>
  );
}
