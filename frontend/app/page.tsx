"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, MeResponse, setCsrfToken } from "../lib/api";

/** Smista alla home giusta in base alla sessione. */
export default function Home() {
  const router = useRouter();
  const t = useTranslations("common");

  useEffect(() => {
    api
      .get<MeResponse>("/api/auth/me")
      .then((me) => {
        setCsrfToken(me.csrfToken);
        router.replace(me.user.ruolo === "ADMIN" ? "/admin" : "/area");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="center-page">
      <p style={{ color: "var(--muted)" }}>{t("loading")}</p>
    </div>
  );
}
