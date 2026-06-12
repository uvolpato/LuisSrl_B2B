import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Il browser parla solo col frontend: /api/* viene proxato al backend.
  // Cosi' cookie di sessione e CSRF restano same-origin.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3001"}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
