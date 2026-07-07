"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ChangePasswordCard from "../auth/ChangePasswordCard";
import Notice from "../common/Notice";
import type { CustomerProfile } from "../../lib/types";

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><line x1="8" y1="6" x2="10" y2="6" /><line x1="16" y1="6" x2="18" y2="6" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="16" y1="10" x2="18" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="16" y1="14" x2="18" y2="14" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function ProfileSection({
  customer,
  onPasswordChanged,
}: {
  customer: CustomerProfile;
  onPasswordChanged: () => void;
}) {
  const t = useTranslations("area");
  const c = customer;

  return (
    <>
      <style>{`
        .profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          width: 100%;
          max-width: 900px;
        }
        @media (max-width: 720px) {
          .profile-grid { grid-template-columns: 1fr; }
        }

        .profile-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius, 12px);
          padding: 28px;
        }
        .profile-card h2 {
          font-family: var(--font-display);
          font-size: 18px;
          margin: 0 0 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -0.01em;
        }
        .profile-card h2 svg { color: var(--accent); }

        .profile-field {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 12px 0;
          border-bottom: 1px solid color-mix(in oklch, var(--border) 50%, transparent);
        }
        .profile-field:last-child { border-bottom: none; }
        .profile-field-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .profile-field-value {
          font-size: 15px;
          color: var(--fg);
        }

        .profile-password-card {
          margin-top: 32px;
          width: 100%;
          max-width: 900px;
        }
      `}</style>

      <h1 style={{
        fontFamily: "var(--font-display)",
        fontSize: 28,
        letterSpacing: "-0.02em",
        margin: "0 0 32px",
      }}>
        {t("profileTitle")}
      </h1>

      <div className="profile-grid">
        {/* Dati azienda */}
        <div className="profile-card">
          <h2><BuildingIcon /> {t("profileDatiAzienda")}</h2>
          {c.ragioneSociale && (
            <div className="profile-field">
              <span className="profile-field-label">{t("profileDatiAzienda")}</span>
              <span className="profile-field-value">{c.ragioneSociale}</span>
            </div>
          )}
          <div className="profile-field">
            <span className="profile-field-label">Email</span>
            <span className="profile-field-value">{c.email}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">{t("profileReferente")}</span>
            <span className="profile-field-value">{c.nome}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">{t("profileTelefono")}</span>
            <span className="profile-field-value">{c.telefono || "—"}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">{t("profileTelefonoFisso")}</span>
            <span className="profile-field-value">{c.telefonoFisso || "—"}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">{t("profileSitoWeb")}</span>
            <span className="profile-field-value">
              {c.sitoWeb ? (
                <a href={c.sitoWeb.startsWith("http") ? c.sitoWeb : `https://${c.sitoWeb}`}
                   target="_blank" rel="noopener noreferrer"
                   style={{ color: "var(--accent)", textDecoration: "none" }}>
                  {c.sitoWeb}
                </a>
              ) : "—"}
            </span>
          </div>
        </div>

        {/* Sicurezza */}
        <div className="profile-card">
          <h2><ShieldIcon /> {t("profileSicurezza")}</h2>
          <div className="profile-field">
            <span className="profile-field-label">{t("profileLastAccess")}</span>
            <span className="profile-field-value">{t("profileLastAccessUnknown")}</span>
          </div>
        </div>
      </div>

      <div className="profile-password-card">
        <ChangePasswordCard onChanged={onPasswordChanged} />
      </div>
    </>
  );
}
