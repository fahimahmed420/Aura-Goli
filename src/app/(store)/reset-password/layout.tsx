import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Aura Goli",
  description: "Set a new password for your Aura Goli account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
