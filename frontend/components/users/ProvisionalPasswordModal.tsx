"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "../common/Modal";

/** Mostra la password provvisoria appena generata (visibile solo una volta). */
export default function ProvisionalPasswordModal({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);

  return (
    <Modal title={t("provisionalTitle")} onClose={onClose}>
      <p style={{ color: "var(--muted)" }}>{t("provisionalNote")}</p>
      <p className="mono" style={{ fontSize: 14 }}>{email}</p>
      <div
        className="warn-box mono"
        style={{ fontSize: 22, textAlign: "center", letterSpacing: 2 }}
      >
        {password}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(password).then(() => {
              setCopied(true);
            });
          }}
        >
          {copied ? tc("copied") : tc("copy")}
        </button>
        <button className="primary" onClick={onClose}>
          {tc("close")}
        </button>
      </div>
    </Modal>
  );
}
