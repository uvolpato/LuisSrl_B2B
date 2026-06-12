"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { api, setCsrfToken } from "../../lib/api";
import type { UserProfile } from "../../lib/types";

export default function Header({ user }: { user: UserProfile }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  async function logout() {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setCsrfToken(null);
      router.replace("/login");
    }
  }

  function switchLang(lang: string) {
    document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">Luis S.r.l.</span>
        <strong style={{ marginLeft: 10 }}>{t("appName")}</strong>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <select
          aria-label={t("language")}
          value={locale}
          onChange={(e) => switchLang(e.target.value)}
          style={{ width: "auto" }}
        >
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{user.email}</span>
        <button className="small" onClick={logout}>
          {t("logout")}
        </button>
      </div>
    </header>
  );
}
