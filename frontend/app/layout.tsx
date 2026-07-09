import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import ConfirmProvider from "../components/common/ConfirmProvider";
import "./globals.css";
import "./landing.css";
// Caricato globalmente (tutto scopato sotto .catalogo-page) così resta sempre
// presente durante la navigazione client verso l'area — evita il layout rotto
// entrando dalla dashboard prima che il foglio della pagina sia applicato.
import "./area/catalogo.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return { title: t("appName") };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ConfirmProvider>{children}</ConfirmProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
