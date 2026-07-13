"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CustomerProfile } from "../../lib/types";
import { api, ApiError } from "../../lib/api";

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
  const [pwOpen, setPwOpen] = useState(false);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwOk, setPwOk] = useState(false);

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (pwNew.length < 8) { setPwError("Minimo 8 caratteri."); return; }
    if (pwNew !== pwConfirm) { setPwError("Le password non coincidono."); return; }
    try {
      await api.post("/api/auth/change-password", { oldPassword: pwOld, newPassword: pwNew });
      setPwOk(true);
      onPasswordChanged();
      setTimeout(() => { setPwOpen(false); setPwOk(false); setPwOld(""); setPwNew(""); setPwConfirm(""); }, 1500);
    } catch (err) {
      setPwError(err instanceof ApiError ? err.code : "errors.generic");
    }
  };

  return (
    <>
      <h1>{t("profileTitle")}</h1>

      <div className="profile-grid">

        {/* Anagrafica */}
        <div className="profile-card">
          <h2><BuildingIcon /> Anagrafica</h2>

          {c.ragioneSociale && (
            <div className="profile-field">
              <label>{t("profileRagioneSociale")}</label>
              <div className="value">{c.ragioneSociale}</div>
            </div>
          )}

          {c.partitaIva && (
            <div className="profile-field">
              <label>{t("profilePiva")}</label>
              <div className="value">{c.partitaIva}</div>
            </div>
          )}

          {c.codiceCliente && (
            <div className="profile-field">
              <label>{t("profileCodiceCliente")}</label>
              <div className="value">{c.codiceCliente}</div>
            </div>
          )}

          <div className="profile-field">
            <label>{t("profileEmail")}</label>
            <div className="value readonly">{c.email}</div>
          </div>

          <div className="profile-field">
            <label>{t("profileReferente")}</label>
            <div className="value">{c.nome}</div>
          </div>

          <div className="profile-field">
            <label>{t("profileTelefono")}</label>
            <div className="value">{c.telefono || "—"}</div>
          </div>

          <div className="profile-field">
            <label>{t("profileTelefonoFisso")}</label>
            <div className="value">{c.telefonoFisso || "—"}</div>
          </div>

          <div className="profile-field">
            <label>{t("profileSitoWeb")}</label>
            <div className="value">
              {c.sitoWeb ? (
                <a href={c.sitoWeb.startsWith("http") ? c.sitoWeb : `https://${c.sitoWeb}`}
                   target="_blank" rel="noopener noreferrer"
                   style={{ color: "var(--accent)", textDecoration: "none" }}>
                  {c.sitoWeb}
                </a>
              ) : "—"}
            </div>
          </div>

          {c.codiceListino && (
            <div className="profile-field">
              <label>{t("profileListino")}</label>
              <div className="value readonly">{c.codiceListino}</div>
            </div>
          )}
        </div>

        {/* Indirizzi */}
        <div className="profile-card">
          <h2>{t("profileIndirizzi")} <span className="badge">1</span></h2>
          <div className="addr-item">
            <div>
              <strong>{c.indirizzo || "—"}</strong><br />
              <span className="meta">{[c.cap, c.citta, c.provincia].filter(Boolean).join(" ")}</span>
            </div>
            <span className="tag" style={{ background: "color-mix(in oklch, var(--accent) 20%, transparent)" }}>{t("profileIndirizzoPrincipale")}</span>
          </div>
        </div>

        {/* Modalità di pagamento */}
        <div className="profile-card">
          <h2>{t("profilePagamento")} <span className="badge">1</span></h2>
          <div className="pay-item">
            <div className="icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M2 10h20"/></svg>
            </div>
            <div className="info">
              <div className="name">{c.codicePagamentoDescrizione || c.codicePagamento || "—"}</div>
              {c.codicePagamento && (
                <div className="detail">Codice: {c.codicePagamento}</div>
              )}
            </div>
            {c.codicePagamento && <span className="tag">Attivo</span>}
          </div>
        </div>

        {/* Sicurezza + password */}
        <div className="profile-card">
          <h2><ShieldIcon /> Sicurezza</h2>

          <div className="sec-item">
            <div>
              <div style={{ fontWeight: 500 }}>Cambio password</div>
              <div className="detail">Ultima modifica: 15/06/2026</div>
            </div>
            <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => setPwOpen(true)}>Modifica</button>
          </div>

          <div className="sec-item">
            <div>
              <div style={{ fontWeight: 500 }}>Ultimo accesso</div>
              <div className="detail">N/D</div>
            </div>
          </div>
        </div>

      </div>

      {/* Change Password Modal */}
      {pwOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setPwOpen(false); setPwError(""); } }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Cambio password">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Cambio password</h2>
              <button onClick={() => { setPwOpen(false); setPwError(""); }}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)", padding: 0, lineHeight: 1 }}
                aria-label="Chiudi">&times;</button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0 16px" }}>Inserisci la password attuale e la nuova password.</p>

            {pwError && (
              <div style={{ background: "oklch(96% 0.03 25)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 14 }}>
                {pwError}
              </div>
            )}
            {pwOk && (
              <div style={{ background: "oklch(95% 0.06 150)", border: "1px solid var(--ok)", color: "var(--ok)", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 14 }}>
                Password aggiornata correttamente.
              </div>
            )}

            <form onSubmit={handlePwSubmit}>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }} htmlFor="cp-old">Password attuale</label>
              <input id="cp-old" type="password" required autoComplete="current-password"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, font: "inherit", fontSize: 14, background: "var(--bg)", color: "var(--fg)", marginBottom: 14, boxSizing: "border-box" }}
                value={pwOld} onChange={(e) => setPwOld(e.target.value)} />

              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }} htmlFor="cp-new">Nuova password</label>
              <input id="cp-new" type="password" required autoComplete="new-password" minLength={8}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, font: "inherit", fontSize: 14, background: "var(--bg)", color: "var(--fg)", marginBottom: 14, boxSizing: "border-box" }}
                value={pwNew} onChange={(e) => setPwNew(e.target.value)} />

              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }} htmlFor="cp-confirm">Conferma nuova password</label>
              <input id="cp-confirm" type="password" required autoComplete="new-password" minLength={8}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, font: "inherit", fontSize: 14, background: "var(--bg)", color: "var(--fg)", marginBottom: 14, boxSizing: "border-box" }}
                value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setPwOpen(false); setPwError(""); }}>Annulla</button>
                <button type="submit" className="btn btn-primary">Cambia password</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
