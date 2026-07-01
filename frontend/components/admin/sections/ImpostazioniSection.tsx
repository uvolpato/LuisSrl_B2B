"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";

interface SiteConfig {
  id: number;
  key: string;
  value: string;
}

export default function ImpostazioniSection() {
  const [configs, setConfigs] = useState<SiteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SiteConfig[]>("/api/admin/config");
      setConfigs(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  async function handleSave(key: string, value: string) {
    setSaving(key);
    try {
      await api.put(`/api/admin/config/${encodeURIComponent(key)}`, { value });
      setConfigs((prev) => prev.map((c) => c.key === key ? { ...c, value } : c));
    } catch { /* ignore */ }
    setSaving(null);
  }

  if (loading) return <div className="admin-content"><p>Caricamento...</p></div>;

  return (
    <div className="admin-content">
      <div className="content-header">
        <div>
          <h2>Impostazioni</h2>
          <span className="meta">Configurazioni globali del portale.</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
        {configs.map((cfg) => (
          <ConfigField
            key={cfg.key}
            config={cfg}
            saving={saving === cfg.key}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}

function ConfigField({ config, saving, onSave }: { config: SiteConfig; saving: boolean; onSave: (key: string, value: string) => void }) {
  const [value, setValue] = useState(config.value);
  const [dirty, setDirty] = useState(false);
  const isPrompt = config.key === "Prompt_AI_Descrizione_Articolo";

  useEffect(() => { setValue(config.value); setDirty(false); }, [config.value]);

  const label = isPrompt ? "Prompt AI — Descrizione Articolo" : config.key;

  return (
    <div className="readonly-field" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <div className="label">{label}</div>
      <textarea
        className="textarea"
        value={value}
        onChange={(e) => { setValue(e.target.value); setDirty(e.target.value !== config.value); }}
        rows={isPrompt ? 18 : 3}
        style={{ width: "100%", fontFamily: isPrompt ? "var(--font-mono)" : undefined, fontSize: 13 }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn btn-primary btn-sm"
          disabled={!dirty || saving}
          onClick={() => onSave(config.key, value)}
        >
          {saving ? "Salvataggio…" : "Salva"}
        </button>
      </div>
    </div>
  );
}
