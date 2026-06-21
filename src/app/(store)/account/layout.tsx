import type { Metadata } from "next";
import AccountLayoutClient from "./AccountLayoutClient";

export const metadata: Metadata = {
  title: "My Account | Aura Goli",
  description: "Manage your Aura Goli account — orders, wishlist, addresses, and profile.",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
