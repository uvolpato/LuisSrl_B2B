-- Box dashboard: mostra solo articoli già acquistati dal cliente (opposto di escludi_acquistati). Additiva, idempotente.
ALTER TABLE "suggestion_boxes" ADD COLUMN IF NOT EXISTS "solo_acquistati" BOOLEAN NOT NULL DEFAULT false;
