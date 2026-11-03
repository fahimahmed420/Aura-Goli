import type { MetadataRoute } from "next";

// Aura Goli is a portfolio demo, so the whole store stays out of search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
