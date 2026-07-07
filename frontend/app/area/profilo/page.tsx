"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "../../../lib/use-auth";
import LoadingScreen from "../../../components/common/LoadingScreen";
import AreaHeader from "../../../components/area/AreaHeader";
import ProfileSection from "../../../components/area/ProfileSection";
import type { CustomerProfile } from "../../../lib/types";

export default function ProfilePage() {
  const t = useTranslations("area");
  const { user, loading, setUser } = useAuth("customer");

  if (loading || !user || user.userType !== "customer") return <LoadingScreen />;

  const c = user as CustomerProfile;

  return (
    <>
      <AreaHeader />
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 48,
        paddingBottom: 80,
      }}>
        <div className="container" style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: 960,
          paddingInline: 32,
        }}>
          <ProfileSection
            customer={c}
            onPasswordChanged={() => setUser({ ...c, mustChangePassword: false })}
          />
        </div>
      </div>

      <footer className="pagefoot">
        <div className="row-between" style={{ maxWidth: 960, marginInline: "auto", paddingInline: 32 }}>
          <span>© 2026 Luis S.r.l. · Via F. Bellafino 28/30, Bergamo</span>
          <span className="meta" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--muted)" }}>
            info@luisbg.it · +39 035 0521957
          </span>
          <span className="meta" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--muted)" }}>
            Realizzato da <strong>Ugo Volpato</strong> AI Consultant
          </span>
        </div>
      </footer>
    </>
  );
}
