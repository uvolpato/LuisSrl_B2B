import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Next 16 blocca le risorse dev/HMR per origini diverse da localhost non
  // autorizzate: senza questo, accedendo via IP la pagina non si idrata.
  allowedDevOrigins: ["192.168.0.164"],
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
