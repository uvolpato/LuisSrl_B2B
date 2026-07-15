-- ============================================================
-- Deduplica immagini articoli
-- Tiene la PRIMA immagine (id minore = originale) di ogni articolo
-- ed elimina le altre (duplicati creati dal bug "ricarica al salvataggio").
--
-- DISTRUTTIVO sui record DB. Fare un backup prima:
--   pg_dump -U postgres -d LuisSrlDb -F c -f C:\backup\pre-dedup.dump
--
-- Uso:
--   psql "postgresql://postgres:PWD@localhost:5432/LuisSrlDb" -f dedup-immagini.sql
--
-- Nota: i file fisici dei duplicati restano su disco (orfani, innocui: solo
-- spazio). L'app mostra le immagini in base ai record DB, quindi questo basta.
-- ============================================================

-- 1) Report PRIMA: quanti duplicati per articolo (solo lettura)
\echo 'Articoli con piu di 1 immagine (prima della pulizia):'
SELECT articolo_id, count(*) AS immagini
FROM immagini
GROUP BY articolo_id
HAVING count(*) > 1
ORDER BY count(*) DESC;

-- 2) Elimina tutte tranne la prima (id minore) per ogni articolo
DELETE FROM immagini i
USING (SELECT articolo_id, min(id) AS keep_id FROM immagini GROUP BY articolo_id) k
WHERE i.articolo_id = k.articolo_id
  AND i.id <> k.keep_id;

-- 3) La superstite diventa copertina e visibile in galleria
UPDATE immagini SET copertina = true, in_galleria = true;

-- 4) Report DOPO: deve mostrare 0 righe (ogni articolo ha 1 immagine)
\echo 'Articoli con piu di 1 immagine (dopo la pulizia, atteso: nessuno):'
SELECT articolo_id, count(*) AS immagini
FROM immagini
GROUP BY articolo_id
HAVING count(*) > 1;
