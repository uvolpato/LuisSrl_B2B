"use client";

import { useAuth } from "../../../lib/use-auth";
import LoadingScreen from "../../../components/common/LoadingScreen";
import ProfileSection from "../../../components/area/ProfileSection";
import type { CustomerProfile } from "../../../lib/types";

export default function ProfilePage() {
  const { user, loading, setUser } = useAuth("customer");

  if (loading || !user || user.userType !== "customer") return <LoadingScreen />;

  const c = user as CustomerProfile;

  return (
    <>
      <div className="profile-page-main">
        <div className="container">
          <ProfileSection
            customer={c}
            onPasswordChanged={() => setUser({ ...c, mustChangePassword: false })}
          />
        </div>
      </div>
    </>
  );
}
