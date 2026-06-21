import type { Metadata } from "next";
import FAQClient from "./FAQClient";

export const metadata: Metadata = {
  title: "FAQ | Aura Goli",
  description: "Frequently asked questions about shipping, returns, sizing, payments, and more at Aura Goli.",
};

export default function FAQPage() {
  return <FAQClient />;
}
