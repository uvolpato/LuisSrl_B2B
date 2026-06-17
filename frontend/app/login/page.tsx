"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "../../components/common/LoginForm";
import MustChangePasswordModal from "../../components/auth/MustChangePasswordModal";
import type { MeResponse } from "../../lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [mustChange, setMustChange] = useState<{ res: MeResponse; oldPassword: string } | null>(null);

  function onLoginSuccess(res: MeResponse, oldPassword: string) {
    if (res.user.mustChangePassword) {
      setMustChange({ res, oldPassword });
    } else {
      router.replace(res.user.userType === "admin" ? "/admin" : "/area");
    }
  }

  if (mustChange) {
    return (
      <MustChangePasswordModal
        oldPassword={mustChange.oldPassword}
        userType={mustChange.res.user.userType}
        onClose={() => setMustChange(null)}
      />
    );
  }

  return (
    <div className="center-page">
      <div className="card" style={{ width: 380 }}>
        <LoginForm onLoginSuccess={onLoginSuccess} />
      </div>
    </div>
  );
}
