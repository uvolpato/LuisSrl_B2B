-- Aggiunge flag colore/variante alle immagini
ALTER TABLE immagini ADD COLUMN IF NOT EXISTS aggiungi_colore BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE immagini ADD COLUMN IF NOT EXISTS aggiungi_variante BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE immagini ADD COLUMN IF NOT EXISTS prompt_template_id INTEGER;

-- Tabella galleria prompt
CREATE TABLE IF NOT EXISTS prompt_templates (
  id          SERIAL PRIMARY KEY,
  tipo        TEXT NOT NULL,
  titolo      TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '',
  ordinamento INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK per prompt_template_id
ALTER TABLE immagini ADD CONSTRAINT fk_immagini_prompt_template
  FOREIGN KEY (prompt_template_id) REFERENCES prompt_templates(id) ON DELETE SET NULL;
