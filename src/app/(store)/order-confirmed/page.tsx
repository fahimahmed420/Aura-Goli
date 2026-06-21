import { Suspense } from "react";
import OrderConfirmedClient from "./OrderConfirmedClient";

export const metadata = { title: "Order Confirmed — Aura Goli" };

export default function OrderConfirmedPage() {
  return (
    <Suspense>
      <OrderConfirmedClient />
    </Suspense>
  );
}
