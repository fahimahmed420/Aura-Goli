import { Suspense } from "react";
import OrderTrackingClient from "./OrderTrackingClient";

export const metadata = { title: "Track Your Order | Aura Goli" };

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <OrderTrackingClient />
    </Suspense>
  );
}
