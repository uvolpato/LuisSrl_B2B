"use client";

import { type ReactNode, useState } from "react";
import type { UserProfile } from "../../lib/types";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({
  children,
  activeSection,
  onSectionChange,
  user,
  onUserUpdate,
}: {
  children: ReactNode;
  activeSection: string;
  onSectionChange: (id: string) => void;
  user: UserProfile;
  onUserUpdate?: (u: UserProfile) => void;
}) {
  const [mobileSidebar, setMobileSidebar] = useState(false);

  return (
    <div className="admin-page" style={{ display: "flex", minHeight: "100vh" }}>
      {/* Mobile header: logo + hamburger per riaprire la sidebar */}
      <header className="admin-mobile-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/b2b/logo.webp" alt="Luis" className="admin-mobile-logo" />
        <button
          className="admin-mobile-hamburger"
          onClick={() => setMobileSidebar((o) => !o)}
          aria-label="Menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {mobileSidebar && (
        <div className="admin-mobile-backdrop" onClick={() => setMobileSidebar(false)} />
      )}

      <div className={`admin-sidebar-wrap ${mobileSidebar ? "mobile-open" : ""}`}>
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={(id) => { onSectionChange(id); setMobileSidebar(false); }}
          user={user}
          onUserUpdate={onUserUpdate}
        />
      </div>

      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
