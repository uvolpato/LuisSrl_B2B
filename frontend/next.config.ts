import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Non esporre "X-Powered-By: Next.js".
  poweredByHeader: false,
  // Next 16 blocca le risorse dev/HMR per origini diverse da localhost non
  // autorizzate: senza questo, accedendo via IP la pagina non si idrata.
  allowedDevOrigins: ["192.168.0.164"],
  // Security header sulle pagine servite da Next (l'API /api/* e' gia' indurita
  // da Helmet nel backend, quindi escludiamo /api e /ws dal match).
  // NB: niente CSP script-src/style-src qui: una CSP stretta su Next richiede
  // nonce e va testata a parte, altrimenti rompe l'hydration. Copriamo il
  // clickjacking con frame-ancestors + X-Frame-Options.
  async headers() {
    return [
      {
        source: "/((?!api/).*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
  // Il browser parla solo col frontend: /api/* viene proxato al backend.
  // Cosi' cookie di sessione e CSRF restano same-origin.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3001"}/api/:path*`,
      },
      {
        source: "/ws",
        destination: `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3001"}/ws`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
