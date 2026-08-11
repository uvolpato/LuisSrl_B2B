-- One-time fix: sostituisci il codice prodotto con la descrizione variante nelle righe esistenti
UPDATE righe_ordini ro SET descrizione = v.descrizione
FROM varianti v
WHERE v.codice = ro.codice_prodotto
  AND (ro.descrizione IS NULL OR ro.descrizione = '' OR ro.descrizione = ro.codice_prodotto);
