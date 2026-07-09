-- Aggiunge colonne di progresso alla tabella sync_log
ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS progress_pct    INT NOT NULL DEFAULT 0;
ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS progress_phase  TEXT;
