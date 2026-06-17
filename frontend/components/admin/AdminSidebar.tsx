"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, setCsrfToken } from "../../lib/api";
import type { UserProfile } from "../../lib/types";
import SettingsModal from "./SettingsModal";
import Modal from "../common/Modal";

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

// Icone identiche al prototipo 06-admin.html
const ICONS: Record<string, React.ReactNode> = {
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  folder: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  bag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.47 6.53L21 10.5l-6.53 2.47L12 19.5l-2.47-6.53L3 10.5l6.53-2.47z"/></svg>,
};

const IconLogout = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconSettings = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconShield = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

function getInitials(name: string | null): string {
  if (!name) return "??";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
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
  const tc = useTranslations("common");
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [demoModal, setDemoModal] = useState<"sm" | "md" | "lg" | null>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Chiude il menu utente al click fuori
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function logout() {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setCsrfToken(null);
      router.replace("/");
    }
  }

  const name = user.nome || user.email;
  const initials = getInitials(user.nome);

  return (
    <>
    <aside className="sidebar">
      <div className="sidebar-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                {ICONS[item.icon]}
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Sezione utente: avatar, nome, stato Attivo (bollino verde), logout */}
      <div className="sidebar-user" ref={userRef}>
        {menuOpen && (
          <div className="sidebar-user-pop">
            <div className="sidebar-user-pop-header">
              <span className="sidebar-user-avatar" style={{ background: user.avatarColor, color: "#fff" }}>
                {initials}
                <span className="sidebar-user-dot" />
              </span>
              <div className="sidebar-user-text">
                <span className="sidebar-user-name">{name}</span>
                <span className="sidebar-user-status">
                  <span className="dot" /> {tc("online")}
                </span>
              </div>
            </div>
            <hr />
            <button className="sidebar-user-pop-item" onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}>
              {IconSettings}
              Impostazioni
            </button>
            {(user.ruolo === "SUPERUSER" || user.ruolo === "AMMINISTRATORE") && (
              <button className="sidebar-user-pop-item" onClick={() => { setMenuOpen(false); onSectionChange("admin-panel"); }}>
                {IconShield}
                Pannello di Amministrazione
              </button>
            )}
            <hr />
            {(user.ruolo === "SUPERUSER" || user.ruolo === "AMMINISTRATORE") && (<>
              {/* TMP DEMO: anteprime modali — da eliminare */}
              <span className="sidebar-section" style={{ padding: "8px 8px 2px", fontSize: 10 }}>PROVA MODALI</span>
              <button className="sidebar-user-pop-item" style={{ fontSize: 12 }} onClick={() => { setMenuOpen(false); setDemoModal("sm"); }}>Modal SM (120px)</button>
              <button className="sidebar-user-pop-item" style={{ fontSize: 12 }} onClick={() => { setMenuOpen(false); setDemoModal("md"); }}>Modal MD (80px)</button>
              <button className="sidebar-user-pop-item" style={{ fontSize: 12 }} onClick={() => { setMenuOpen(false); setDemoModal("lg"); }}>Modal LG (40px)</button>
              <hr />
            </>)}
            <button className="sidebar-user-pop-item danger" onClick={logout}>
              {IconLogout}
              {tc("logout")}
            </button>
          </div>
        )}

        <button
          className="sidebar-user-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="sidebar-user-avatar" style={{ background: user.avatarColor, color: "#fff" }}>
            {initials}
            <span className="sidebar-user-dot" />
          </span>
          <div className="sidebar-user-text">
            <span className="sidebar-user-name">{name}</span>
            <span className="sidebar-user-status">
              <span className="dot" /> {tc("online")}
            </span>
          </div>
        </button>
      </div>

      <div className="sidebar-credit">
        Realizzato da <strong>Ugo Volpato</strong> AI Consultant
      </div>
    </aside>

      {settingsOpen && (
        <SettingsModal
          isAdmin={user.ruolo === "SUPERUSER" || user.ruolo === "AMMINISTRATORE"}
          onClose={() => setSettingsOpen(false)}
          onNavigateAdmin={() => { setSettingsOpen(false); onSectionChange("admin-panel"); }}
        />
      )}

      {/* TMP DEMO modali — da eliminare */}
      <Modal open={demoModal === "sm"} size="sm" title="Modal SM" onClose={() => setDemoModal(null)}>
        <p style={{ color: "var(--muted)", padding: "40px 0", textAlign: "center" }}>Contenuto SM — inset 120px</p>
      </Modal>
      <Modal open={demoModal === "md"} size="md" title="Modal MD" onClose={() => setDemoModal(null)}>
        <p style={{ color: "var(--muted)", padding: "60px 0", textAlign: "center" }}>Contenuto MD — inset 80px</p>
      </Modal>
      <Modal open={demoModal === "lg"} size="lg" title="Modal LG" onClose={() => setDemoModal(null)}>
        <p style={{ color: "var(--muted)", padding: "80px 0", textAlign: "center" }}>Contenuto LG — inset 40px</p>
      </Modal>
    </>
  );
}
