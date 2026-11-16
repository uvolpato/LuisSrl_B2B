-- Rimuove la descrizione manuale della composizione: il campo non serve (i pezzi
-- bastano al prompt AI, la descrizione articolo resta quella dell'articolo).
ALTER TABLE varianti DROP COLUMN IF EXISTS descrizione_composizione;
