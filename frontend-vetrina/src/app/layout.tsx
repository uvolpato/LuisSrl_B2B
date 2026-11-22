import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Reveal from '@/components/ui/Reveal';
import HasJs from '@/components/ui/HasJs';
import { SITE } from '@/lib/siteConfig';
import '../styles/globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    metadataBase: new URL(SITE.url),
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/' },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Come il prototipo: le animazioni si attivano solo con JS, senza JS tutto resta visibile. */}
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <HasJs />
          <Header />
          {children}
          <Footer />
          <Reveal />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
