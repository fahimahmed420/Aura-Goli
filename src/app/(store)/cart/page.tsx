import { Suspense } from "react";
import CartClient from "./CartClient";

export const metadata = { title: "Your Cart — Aura Goli" };

export default function CartPage() {
  return (
    <Suspense>
      <CartClient />
    </Suspense>
  );
}
