"use client";

import { useTranslations } from "next-intl";
import type { UserProfile } from "../../lib/types";

const NAV_ITEMS = [
  {
    section: "Gestione",
    items: [
      { id: "articoli", label: "Articoli", icon: "grid" },
      { id: "famiglie", label: "Famiglie", icon: "list" },
      { id: "raccolte", label: "Raccolte", icon: "folder" },
    ],
  },
  {
    section: "Vendite",
    items: [
      { id: "clienti", label: "Clienti", icon: "users" },
      { id: "ordini", label: "Ordini", icon: "bag" },
    ],
  },
  {
    section: "Strumenti",
    items: [
      { id: "import", label: "Import / Export", icon: "upload" },
      { id: "ai", label: "AI / Ricerca", icon: "star" },
    ],
  },
];

const ICONS: Record<string, React.ReactNode> = {
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  folder: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  bag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>,
};

function getInitials(name: string | null): string {
  if (!name) return "??";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function AdminSidebar({
  activeSection,
  onSectionChange,
  user,
}: {
  activeSection: string;
  onSectionChange: (id: string) => void;
  user: UserProfile;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/images/b2b/logo.webp" alt="Luis" />
        <span className="badge">Admin</span>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((group) => (
          <div key={group.section}>
            <span className="sidebar-section">{group.section}</span>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`sidebar-link ${activeSection === item.id ? "active" : ""}`}
                onClick={() => onSectionChange(item.id)}
              >
                {ICONS[item.id]}
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="avatar">{getInitials(user.nome)}</div>
        <span>{user.nome || user.email}</span>
      </div>
      <div style={{ padding: "8px 16px", fontSize: 11, color: "var(--muted)", textAlign: "center", borderTop: "1px solid var(--border)" }}>
        Realizzato da <strong>Ugo Volpato</strong> AI Consultant
      </div>
    </aside>
  );
}
