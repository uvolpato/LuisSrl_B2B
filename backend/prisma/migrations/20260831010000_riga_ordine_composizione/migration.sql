-- Storicizza la composizione economica della riga d'ordine.
-- Oggi si salva solo il netto: listino e sconto sono calcolati al volo in checkout e
-- scartati, quindi irrecuperabili (listini e promozioni cambiano nel tempo).
-- Additivo e idempotente: 'prezzo' resta invariato, nessun dato esistente viene toccato.

ALTER TABLE righe_ordini ADD COLUMN IF NOT EXISTS prezzo_listino NUMERIC(12,4);
ALTER TABLE righe_ordini ADD COLUMN IF NOT EXISTS sconto_pct     NUMERIC(6,3);
ALTER TABLE righe_ordini ADD COLUMN IF NOT EXISTS prezzo_netto   NUMERIC(12,4);
