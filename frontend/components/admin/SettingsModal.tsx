"use client";

import { useState } from "react";
import Modal from "../common/Modal";

const IconUser = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconInfo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const IconSearch = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconAdminUser = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative" }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    <circle cx="18" cy="18" r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2.5" />
    <polyline points="16.5 18 17.5 19 19.5 17" stroke="var(--surface)" strokeWidth="2" />
  </svg>
);

const MENU_ITEMS = [
  { id: "account", label: "Account", icon: IconUser },
  { id: "informazioni", label: "Informazioni", icon: IconInfo },
];

export default function SettingsModal({
  onClose,
  isAdmin,
  onNavigateAdmin,
}: {
  onClose: () => void;
  isAdmin?: boolean;
  onNavigateAdmin?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("account");
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const filteredItems = MENU_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal size="lg" noHeader onClose={onClose}>
      <div className="settings-modal">
        <div className={`settings-sidebar ${mobileSidebar ? "mobile-open" : ""}`}>
          <div className="settings-search">
            {IconSearch}
            <input
              type="text"
              placeholder="Cerca impostazioni..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <nav className="settings-nav">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                className={`settings-nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => { setActiveTab(item.id); setMobileSidebar(false); }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          {isAdmin && (
            <div className="settings-sidebar-bottom">
              <button className="settings-nav-item settings-admin-item" onClick={onNavigateAdmin}>
                {IconAdminUser}
                Impostazioni amministrazione
              </button>
            </div>
          )}
        </div>
        {mobileSidebar && (
          <div className="settings-mobile-backdrop" onClick={() => setMobileSidebar(false)} />
        )}
        <div className="settings-content">
          <div className="settings-content-header">
            <button className="settings-hamburger" onClick={(e) => { e.stopPropagation(); setMobileSidebar((o) => !o); }} aria-label="Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h2>{MENU_ITEMS.find((i) => i.id === activeTab)?.label ?? ""}</h2>
            <button className="settings-close" onClick={onClose} aria-label="Chiudi">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="settings-page">
            {activeTab === "account" && (
              <div className="settings-empty-state">
                <div className="settings-empty-icon">{IconUser}</div>
                <h3>Account</h3>
                <p>Le impostazioni dell&apos;account saranno disponibili qui.</p>
              </div>
            )}
            {activeTab === "informazioni" && (
              <div className="settings-empty-state">
                <div className="settings-empty-icon">{IconInfo}</div>
                <h3>Informazioni</h3>
                <p>Le informazioni sulla piattaforma saranno disponibili qui.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}