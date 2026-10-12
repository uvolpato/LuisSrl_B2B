-- Fase 3 qualifica lead: data decisione (approva/scarta) dal pulsante mail. Additiva.
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "decisione_il" TIMESTAMP(3);
