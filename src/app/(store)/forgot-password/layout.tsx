import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | Aura Goli",
  description: "Reset your Aura Goli account password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
