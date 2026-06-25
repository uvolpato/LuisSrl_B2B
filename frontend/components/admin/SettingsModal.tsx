"use client";

import { useState } from "react";
import Modal from "../common/Modal";
import ChangePasswordModal from "../auth/ChangePasswordModal";
import { api, ApiError } from "../../lib/api";
import { APP_VERSION } from "../../lib/version";
import type { UserProfile } from "../../lib/types";
import { initials } from "../../lib/helpers";

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
  user,
  onClose,
  isAdmin,
  onNavigateAdmin,
  onUserUpdate,
}: {
  user: UserProfile;
  onClose: () => void;
  isAdmin?: boolean;
  onNavigateAdmin?: () => void;
  onUserUpdate?: (u: UserProfile) => void;
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
            {activeTab === "account" && <AccountTab user={user} onUserUpdate={onUserUpdate} />}
            {activeTab === "informazioni" && <InfoTab />}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InfoTab() {
  const [showLicense, setShowLicense] = useState(false);

  return (
    <div className="info-tab">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/b2b/logo.webp" alt="Luis S.r.l." className="info-logo" />
      <span className="info-version">v{APP_VERSION}</span>
      <h3 className="info-name">Portale B2B Luis S.r.l.</h3>
      <p className="info-desc">
        Piattaforma riservata ai rivenditori: catalogo sempre aggiornato, prezzi e
        sconti personalizzati per cliente, disponibilità di magazzino e gestione
        ordini, con integrazione al gestionale Integra.
      </p>
      <div className="info-divider" />
      <div className="info-credits">
        <div className="info-credit-row">
          <span className="info-credit-label">Creato da</span>
          <span className="info-credit-value">Ugo Volpato</span>
        </div>
        <div className="info-credit-row">
          <span className="info-credit-label">Licenza</span>
          <span className="info-credit-value">BSL 1.1 — open source from 2031</span>
        </div>
        <div className="info-credit-row">
          <span className="info-credit-label">Repository</span>
          <a href="https://github.com/luis-srl/b2b-portale" target="_blank" rel="noopener noreferrer" className="info-credit-value info-link">
            github.com/luis-srl/b2b-portale
          </a>
        </div>
      </div>
      <p className="info-copyright">
        Copyright &copy; 2026 Ugo Volpato. Licenza BSL 1.1 — Concesso in licenza a Luis S.r.l.
      </p>
      <button className="info-license-link" onClick={() => setShowLicense(true)}>
        Leggi licenza completa
      </button>
      {showLicense && <LicenseModal onClose={() => setShowLicense(false)} />}
    </div>
  );
}

function AccountTab({
  user,
  onUserUpdate,
}: {
  user: UserProfile;
  onUserUpdate?: (u: UserProfile) => void;
}) {
  const [nome, setNome] = useState(user.nome);
  const [bio, setBio] = useState(user.bio ?? "");
  const [gender, setGender] = useState(user.gender ?? "non-specificato");
  const [birthDate, setBirthDate] = useState(user.birthDate ? user.birthDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwModal, setShowPwModal] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api.patch<{ user: UserProfile }>("/api/auth/profile", {
        nome,
        bio: bio.trim() || null,
        gender,
        birthDate: birthDate || null,
      });
      onUserUpdate?.(res.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="account-tab">
      <div className="account-head">
        <h3>Il tuo account</h3>
        <p>Gestisci le informazioni del tuo account.</p>
      </div>

      <div className="account-main">
        <span className="account-avatar" style={{ background: user.avatarColor }}>
          {initials(user.nome)}
        </span>
        <div className="account-fields">
          <div className="account-field">
            <label>Nome</label>
            <input
              className="account-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="account-field">
            <label>Bio</label>
            <textarea
              className="account-input account-textarea"
              placeholder="Condividi il tuo background e i tuoi interessi"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="account-field account-field-indent">
        <label>Genere</label>
        <div className="account-select-wrap">
          <select
            className="account-input account-select"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="non-specificato">Preferisco non dirlo</option>
            <option value="uomo">Uomo</option>
            <option value="donna">Donna</option>
            <option value="altro">Altro</option>
          </select>
          <svg className="account-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </div>
      </div>

      <div className="account-field account-field-indent">
        <label>Data di nascita</label>
        <input
          className="account-input"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </div>

      <div className="account-actions">
        {error && <span className="account-save-msg account-save-err">{error}</span>}
        {saved && <span className="account-save-msg account-save-ok">Salvato ✓</span>}
        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={save} disabled={saving}>
          {saving ? "Salvataggio…" : "Salva"}
        </button>
      </div>

      <div className="account-divider" />

      <button className="account-pw-toggle" onClick={() => setShowPwModal(true)}>
        <span>Cambia password</span>
        <span className="account-pw-action">Modifica</span>
      </button>

      {showPwModal && (
        <ChangePasswordModal
          onClose={() => setShowPwModal(false)}
          onChanged={() => setShowPwModal(false)}
        />
      )}
    </div>
  );
}

function LicenseModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal size="md" onClose={onClose}>
      <div className="license-modal">
        <h3>Business Source License 1.1</h3>
        <p className="license-badge">Open source from 2031</p>
        <p className="license-meta">
          Licensor: <strong>Ugo Volpato</strong><br />
          Licensed Work: <strong>Portale B2B Luis S.r.l.</strong><br />
          Additional Use Grant: <strong>None</strong><br />
          Change Date: <strong>2031-06-19</strong> (5 anni)<br />
          Change License: <strong>GPL v2.0 o successive</strong>
        </p>
        <div className="license-body">
          <pre>
{`Business Source License 1.1

License text copyright (c) 2017 MariaDB Corporation Ab, All Rights Reserved.
"Business Source License" is a trademark of MariaDB Corporation Ab.

----------------------------------------------------------------------------
Terms
----------------------------------------------------------------------------

The Licensor hereby grants you the right to copy, modify, create derivative
works, redistribute, and make non-production use of the Licensed Work. The
Licensor may make an Additional Use Grant, above, permitting limited
production use.

Effective on the Change Date, or the fifth anniversary of the first
publicly available distribution of a specific version of the Licensed Work
under this License, whichever comes first, the Licensor hereby grants you
rights under the terms of the Change License, and the rights granted in the
paragraph above terminate.

If your use of the Licensed Work does not comply with the requirements
currently in effect as described in this License, you must purchase a
commercial license from the Licensor, its affiliated entities, or authorized
resellers, or you must refrain from using the Licensed Work.

All copies of the original and modified Licensed Work, and derivative works
of the Licensed Work, are subject to this License. This License applies
separately for each version of the Licensed Work and the Change Date may
vary for each version of the Licensed Work released by Licensor.

You must conspicuously display this License on each original or modified
copy of the Licensed Work. If you receive the Licensed Work in original or
modified form from a third party, the terms and conditions set forth in
this License apply to your use of that work.

Any use of the Licensed Work in violation of this License will immediately
terminate your rights under this License for the current and all other
versions of the Licensed Work.

This License does not grant you any right in any trademark or logo of
Licensor or its affiliates (provided that you may use a trademark or logo
of Licensor as expressly required by this License).

TO THE EXTENT PERMITTED BY APPLICABLE LAW, THE LICENSED WORK IS PROVIDED
ON AN "AS IS" BASIS. LICENSOR HEREBY DISCLAIMS ALL WARRANTIES AND
CONDITIONS, EXPRESS OR IMPLIED, INCLUDING (WITHOUT LIMITATION) WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
AND TITLE.

----------------------------------------------------------------------------
Covenants of Licensor
----------------------------------------------------------------------------

In consideration of the right to use this License's text and the "Business
Source License" name and trademark, Licensor covenants to MariaDB, and to
all other recipients of the licensed work to be provided by Licensor:

1. To specify as the Change License the GPL Version 2.0 or any later
   version, or a license that is compatible with GPL Version 2.0 or a later
   version, where "compatible" means that software provided under the
   Change License can be included in a program with software provided under
   GPL Version 2.0 or a later version. Licensor may specify additional
   Change Licenses without limitation.

2. To either: (a) specify an additional grant of rights to use that does
   not impose any additional restriction on the right granted in this
   License, as the Additional Use Grant; or (b) insert the text "None".

3. To specify a Change Date.

4. Not to modify this License in any other way.`}
          </pre>
        </div>
        <button className="admin-btn" onClick={onClose}>Chiudi</button>
      </div>
    </Modal>
  );
}
