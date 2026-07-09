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
import RaccolteSection from "../../components/admin/sections/RaccolteSection";
import FamiglieSection from "../../components/admin/sections/FamiglieSection";

const SECTION_TITLES: Record<string, string> = {
  clienti: "Gestione Clienti",
  articoli: "Gestione Articoli",
  famiglie: "Famiglie (da Integra)",
  raccolte: "Raccolte di portale",
  ordini: "Ordini",
  import: "Import / Export",
  ai: "AI / Ricerca",
  "admin-panel": "Pannello di Amministrazione",
  accessi: "Accessi",
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

      {section === "famiglie" && <FamiglieSection />}

      {section === "raccolte" && <RaccolteSection />}

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
