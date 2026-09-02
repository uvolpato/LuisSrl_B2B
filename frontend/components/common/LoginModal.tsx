"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "./LoginForm";
import FocusTrap from "./FocusTrap";
import Modal from "./Modal";
import MustChangePasswordModal from "../auth/MustChangePasswordModal";
import type { MeResponse } from "../../lib/types";

/** Modale di login: backdrop cliccabile, chiusura con Esc, auto-focus. */
export default function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mustChange, setMustChange] = useState<{ res: MeResponse; oldPassword: string } | null>(null);

  useEffect(() => {
    const el = document.getElementById("login-email");
    el?.focus();
  }, []);

  function onLoginSuccess(res: MeResponse, oldPassword: string) {
    if (res.user.mustChangePassword) {
      setMustChange({ res, oldPassword });
    } else {
      onClose();
      router.replace(res.user.userType === "admin" ? "/admin" : "/area");
    }
  }

  function onMustChangeClose() {
    setMustChange(null);
  }

  if (mustChange) {
    return (
      <MustChangePasswordModal
        oldPassword={mustChange.oldPassword}
        userType={mustChange.res.user.userType}
        onClose={onMustChangeClose}
      />
    );
  }

  return (
    <FocusTrap>
      <Modal size="sm" maxWidth={480} noHeader onClose={onClose}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)", padding: 0, lineHeight: 1 }}
            aria-label="Chiudi"
          >
            &times;
          </button>
        </div>
        <LoginForm onLoginSuccess={onLoginSuccess} />
      </Modal>
    </FocusTrap>
  );
}
