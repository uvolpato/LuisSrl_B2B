-- SEO vetrina: slug leggibile e stabile per le collezioni. Additivo, nessuna colonna rimossa.
ALTER TABLE "famiglie" ADD COLUMN IF NOT EXISTS "slug" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "famiglie_slug_key" ON "famiglie" ("slug") WHERE "slug" IS NOT NULL;

-- Normalizza il nome in slug URL-safe e risolve i conflitti con un suffisso numerico.
CREATE OR REPLACE FUNCTION "famiglie_slugify"(p_nome TEXT, p_codice TEXT) RETURNS TEXT AS $$
DECLARE
  base TEXT;
  cand TEXT;
  n INT := 2;
BEGIN
  base := lower(coalesce(p_nome, ''));
  base := translate(base, 'àèéìòùáíóú', 'aeiouaeiou');
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := btrim(base, '-');
  base := left(base, 70);
  IF base = '' THEN
    base := 'famiglia-' || substr(md5(coalesce(p_codice, 'x')), 1, 6);
  END IF;
  cand := base;
  WHILE EXISTS (SELECT 1 FROM "famiglie" WHERE "slug" = cand AND "codice" <> p_codice) LOOP
    cand := base || '-' || n;
    n := n + 1;
  END LOOP;
  RETURN cand;
END;
$$ LANGUAGE plpgsql;

-- Ogni nuova famiglia (import Integra, seed, inserimento manuale) riceve uno slug
-- senza toccare i percorsi di scrittura. Il rename non lo cambia: il trigger è solo INSERT.
CREATE OR REPLACE FUNCTION "famiglie_slug_bi"() RETURNS trigger AS $$
BEGIN
  IF NEW."slug" IS NULL THEN
    NEW."slug" := "famiglie_slugify"(coalesce(NEW."nome_portale", NEW."nome"), NEW."codice");
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "famiglie_slug_before_insert" ON "famiglie";
CREATE TRIGGER "famiglie_slug_before_insert" BEFORE INSERT ON "famiglie"
  FOR EACH ROW EXECUTE FUNCTION "famiglie_slug_bi"();

-- Backfill una riga alla volta: ogni UPDATE vede gli slug già assegnati dai precedenti.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT "codice", coalesce("nome_portale", "nome") AS nome
           FROM "famiglie" WHERE "slug" IS NULL ORDER BY "codice"
  LOOP
    UPDATE "famiglie"
    SET "slug" = "famiglie_slugify"(r.nome, r."codice"), "updated_at" = now()
    WHERE "codice" = r."codice";
  END LOOP;
END $$;
