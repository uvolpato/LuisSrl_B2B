import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const BACKEND = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Stessi security header del portale B2B (vedi frontend/next.config.ts).
  async headers() {
    return [
      {
        source: '/((?!api/).*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
  // Sicurezza: si proxa SOLO il ridimensionamento immagini (pubblico). Il resto
  // dell'API (login, carrello, ordini...) non deve essere raggiungibile dal dominio vetrina.
  async rewrites() {
    return [{ source: '/api/img', destination: `${BACKEND}/api/img` }];
  },
};

export default withNextIntl(nextConfig);
