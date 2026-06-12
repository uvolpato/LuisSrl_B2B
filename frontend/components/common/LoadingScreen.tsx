"use client";

import { useTranslations } from "next-intl";

/** Schermata di attesa a pagina intera, usata durante il ripristino sessione. */
export default function LoadingScreen() {
  const t = useTranslations("common");
  return (
    <div className="center-page">
      <p style={{ color: "var(--muted)" }}>{t("loading")}</p>
    </div>
  );
}
