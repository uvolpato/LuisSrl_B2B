-- Il codice linea è la chiave dell'articolo e finisce nei path delle URL
-- (/area/catalogo/<codice>, /api/..., link condivisi). Una `/` o uno spazio
-- rompono routing e link: qui si normalizzano i codici già presenti e si blocca
-- l'ingresso dei futuri (il vincolo fa fallire l'import invece di creare un link
-- rotto in silenzio).

UPDATE articoli
SET codice_linea = regexp_replace(
      regexp_replace(btrim(codice_linea), '[^A-Za-z0-9._-]+', '-', 'g'),
      '^-+|-+$', '', 'g'
    )
WHERE codice_linea !~ '^[A-Za-z0-9._-]+$';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articoli_codice_linea_sicuro') THEN
    ALTER TABLE articoli
      ADD CONSTRAINT articoli_codice_linea_sicuro CHECK (codice_linea ~ '^[A-Za-z0-9._-]+$');
  END IF;
END $$;
