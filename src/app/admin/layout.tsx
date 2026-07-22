import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aura Goli — Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Text fonts are self-hosted globally via globals.css. Only the Material
          Symbols icon font is loaded from Google. */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
