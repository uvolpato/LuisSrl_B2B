"use client";

import { useEffect, useRef, type ReactNode } from "react";
import LoginForm from "./LoginForm";

/** Modale di login: backdrop cliccabile, chiusura con Esc, auto-focus. */
export default function LoginModal({ onClose }: { onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);

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

  return (
    <FocusTrap>
      <div
        ref={backdropRef}
        className="modal-backdrop"
        onClick={onClose}
        style={{ zIndex: 10000 }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Accesso">
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
          <LoginForm />
        </div>
      </div>
    </FocusTrap>
  );
}

function FocusTrap({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const focusable = (el: Element): el is HTMLElement =>
      el instanceof HTMLElement &&
      el.tabIndex >= 0 &&
      !el.hasAttribute("disabled");
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(focusable);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
