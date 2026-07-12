"use client";

import { useState, type ReactNode } from "react";
import { IconRefresh } from "../admin/icons";

interface SyncButtonProps {
  onClick: () => Promise<void>;
  label?: string;
  className?: string;
  icon?: ReactNode;
}

export default function SyncButton({
  onClick,
  label = "Sincronizza",
  className = "admin-btn admin-btn-secondary",
  icon,
}: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);

  async function handleClick() {
    if (syncing) return;
    setSyncing(true);
    try {
      await onClick();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      style={{ minWidth: 130, justifyContent: "center" }}
      disabled={syncing}
      onClick={handleClick}
    >
      <span className={`sync-icon ${syncing ? "spin" : ""}`}>{icon ?? IconRefresh}</span>
      <span>{label}</span>
    </button>
  );
}
