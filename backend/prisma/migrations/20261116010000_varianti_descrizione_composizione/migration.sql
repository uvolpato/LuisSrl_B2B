-- Descrizione breve della composizione (kit), compilata a mano in admin e usata
-- nel prompt che genera la descrizione articolo. Additivo: colonna nullabile.

ALTER TABLE varianti ADD COLUMN IF NOT EXISTS descrizione_composizione TEXT;
