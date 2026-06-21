import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export const metadata = { title: "Checkout — Aura Goli" };

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutClient />
    </Suspense>
  );
}
