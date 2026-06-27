import type { NextConfig } from "next";

// In dev, Next.js injects an inline runtime + uses eval for HMR/React Refresh,
// so 'unsafe-eval'/'unsafe-inline' are unavoidable. In production we drop them.
const isDev = process.env.NODE_ENV !== "production";

// Analytics origins (GA4 + Meta Pixel). Scripts only run if the corresponding
// NEXT_PUBLIC_* env vars are set, but the CSP must allow the origins regardless.
const ANALYTICS_SCRIPT = "https://www.googletagmanager.com https://connect.facebook.net";
const ANALYTICS_CONNECT =
  "https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://connect.facebook.net https://www.facebook.com";

const scriptSrc = isDev
  ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${ANALYTICS_SCRIPT}`
  : `script-src 'self' 'unsafe-inline' ${ANALYTICS_SCRIPT}`; // inline-only; no eval in prod

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // HSTS — force HTTPS for 2 years incl. subdomains (only sent over HTTPS by browsers)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      `connect-src 'self' https://*.supabase.co https://*.supabase.com wss://*.supabase.co ${ANALYTICS_CONNECT}`,
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://sandbox.sslcommerz.com https://securepay.sslcommerz.com",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Larger body limit so base64 product images don't get rejected
  experimental: {
    serverActions: { bodySizeLimit: "15mb" },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
