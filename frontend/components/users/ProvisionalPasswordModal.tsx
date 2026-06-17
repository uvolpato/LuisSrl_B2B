"use client";

import Modal from "../common/Modal";

export default function ProvisionalPasswordModal({
  email,
  onClose,
}: {
  email: string;
  onClose: () => void;
}) {
  return (
    <Modal title="Password provvisoria" size="sm" onClose={onClose}>
      <p style={{ color: "var(--muted)", marginBottom: 16 }}>
        È stata inviata un&apos;email con la password provvisoria a:
      </p>
      <p className="mono" style={{ fontSize: 14, marginBottom: 20 }}>{email}</p>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="primary" onClick={onClose}>Chiudi</button>
      </div>
    </Modal>
  );
}
