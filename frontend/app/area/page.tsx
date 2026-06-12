"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "../../lib/use-auth";
import Header from "../../components/common/Header";
import LoadingScreen from "../../components/common/LoadingScreen";
import ChangePasswordCard from "../../components/auth/ChangePasswordCard";

export default function AreaClientePage() {
  const t = useTranslations("area");
  const { user, loading, setUser } = useAuth("CLIENTE");

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
      <Header user={user} />
      <main className="container" style={{ maxWidth: 640 }}>
        <h1>{t("title")}</h1>
        <p>{t("welcome", { name: user.nome })}</p>

        {user.mustChangePassword && (
          <div className="warn-box">{t("mustChange")}</div>
        )}

        {!user.mustChangePassword && (
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {t("catalogSoon")}
            </p>
          </div>
        )}

        <ChangePasswordCard
          onChanged={() => setUser({ ...user, mustChangePassword: false })}
        />
      </main>
    </>
  );
}
