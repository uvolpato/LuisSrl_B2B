"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import "./admin.css";
import { useAuth } from "../../lib/use-auth";
import LoadingScreen from "../../components/common/LoadingScreen";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPanel from "../../components/admin/AdminPanel";
import ArticoliSection from "../../components/admin/sections/ArticoliSection";
import ClientiSection from "../../components/admin/sections/ClientiSection";

import { IconPlus } from "../../components/admin/icons";

const SECTION_TITLES: Record<string, string> = {
  clienti: "Gestione Clienti",
  articoli: "Gestione Articoli",
  famiglie: "Famiglie (da Integra)",
  raccolte: "Raccolte di portale",
  ordini: "Ordini",
  import: "Import / Export",
  ai: "AI / Ricerca",
  "admin-panel": "Pannello di Amministrazione",
};

export default function AdminPage() {
  const t = useTranslations("admin");
  const { user: admin, loading, setUser } = useAuth("admin");
  const [section, setSection] = useState("articoli");

  if (loading || !admin || admin.userType !== "admin") return <LoadingScreen />;

  return (
    <AdminLayout
      activeSection={section}
      onSectionChange={setSection}
      user={admin}
      onUserUpdate={setUser}
    >
      {section === "articoli" && <ArticoliSection />}
      {section === "clienti" && <ClientiSection />}
      {section === "admin-panel" && <AdminPanel />}

      {section === "famiglie" && (
        <div className="admin-content">
          <div className="content-header">
            <div>
              <h2>Famiglie (da Integra)</h2>
              <span className="meta">Raggruppamenti gerarchici importati dal gestionale. Non modificabili dal portale.</span>
            </div>
          </div>
        </div>
      )}

      {section === "raccolte" && (
        <div className="admin-content">
          <div className="content-header">
            <div>
              <h2>Raccolte di portale</h2>
              <span className="meta">Collezioni/etichette gestite e modificate dal portale. Ogni Articolo può appartenere a più Raccolte.</span>
            </div>
            <button className="admin-btn admin-btn-primary admin-btn-sm">
              {IconPlus}
              Nuova Raccolta
            </button>
          </div>
        </div>
      )}

      {["ordini", "import", "ai"].includes(section) && (
        <div className="admin-content">
          <div className="content-header">
            <div>
              <h2>{SECTION_TITLES[section]}</h2>
              <span className="meta">Sezione in sviluppo</span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
