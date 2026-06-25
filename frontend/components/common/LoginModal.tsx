"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "./LoginForm";
import FocusTrap from "./FocusTrap";
import MustChangePasswordModal from "../auth/MustChangePasswordModal";
import type { MeResponse } from "../../lib/types";

/** Modale di login: backdrop cliccabile, chiusura con Esc, auto-focus. */
export default function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [mustChange, setMustChange] = useState<{ res: MeResponse; oldPassword: string } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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
      <div
        ref={backdropRef}
        className="modal-backdrop"
        onPointerDown={(e) => { if (e.target === backdropRef.current && e.button === 0) onClose(); }}
        style={{ zIndex: 10000 }}
      >
        <div className="modal" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Accesso">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div />
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)", padding: 0, lineHeight: 1 }}
              aria-label="Chiudi"
            >
              &times;
            </button>
          </div>
          <LoginForm onLoginSuccess={onLoginSuccess} />
        </div>
      </div>
    </FocusTrap>
  );
}
