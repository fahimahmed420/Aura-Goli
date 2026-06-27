import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aura Goli — Premium T-Shirts",
    short_name: "Aura Goli",
    description: "Premium minimalist T-shirts — ethically sourced, crafted with intention.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b14",
    theme_color: "#0b0b14",
    categories: ["shopping", "lifestyle"],
    icons: [
      // TODO: add dedicated 192x192 and 512x512 (incl. a maskable) PNGs under
      // /public for full install criteria. logo-mark.png works as a fallback.
      { src: "/logo-mark.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
  };
}
