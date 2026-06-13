"use client";

import { type ReactNode } from "react";
import type { UserProfile } from "../../lib/types";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({
  children,
  activeSection,
  onSectionChange,
  user,
}: {
  children: ReactNode;
  activeSection: string;
  onSectionChange: (id: string) => void;
  user: UserProfile;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        user={user}
      />
      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
