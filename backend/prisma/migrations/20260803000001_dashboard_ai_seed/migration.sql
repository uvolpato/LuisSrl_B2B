-- Seed dei 6 SuggestionBox dashboard (idempotente: salta se già presente per titolo)
INSERT INTO suggestion_boxes (titolo, prompt, n_articoli, pesi, solo_in_offerta, escludi_acquistati, scope_famiglia, scope_raccolta, attiva, ordinamento, creato_il, aggiornato_il)
SELECT 'Riprendi da dove hai lasciato',
       'prendi gli articoli che il cliente ha visto o salvato di recente o che ha nei suoi progetti, in ordine di interesse, con giacenza disponibile',
       10,
       '{"acquisti":0.2,"tracking":0.4,"progetti":0.3,"affinita":0.1}',
       false,
       true,
       '',
       '',
       true,
       1,
       now(),
       now()
WHERE NOT EXISTS (SELECT 1 FROM suggestion_boxes WHERE titolo = 'Riprendi da dove hai lasciato');

INSERT INTO suggestion_boxes (titolo, prompt, n_articoli, pesi, solo_in_offerta, escludi_acquistati, scope_famiglia, scope_raccolta, attiva, ordinamento, creato_il, aggiornato_il)
SELECT 'I tuoi prodotti in offerta',
       'prendi gli articoli in offerta che corrispondono alle famiglie preferite del cliente',
       10,
       '{"acquisti":0.4,"tracking":0.25,"progetti":0.2,"affinita":0.15}',
       true,
       true,
       '',
       '',
       true,
       2,
       now(),
       now()
WHERE NOT EXISTS (SELECT 1 FROM suggestion_boxes WHERE titolo = 'I tuoi prodotti in offerta');

INSERT INTO suggestion_boxes (titolo, prompt, n_articoli, pesi, solo_in_offerta, escludi_acquistati, scope_famiglia, scope_raccolta, attiva, ordinamento, creato_il, aggiornato_il)
SELECT 'Offerte relative ai prodotti salvati',
       'prendi gli articoli in offerta simili a quelli che il cliente ha salvato o ha nei progetti',
       10,
       '{"acquisti":0.3,"tracking":0.3,"progetti":0.25,"affinita":0.15}',
       true,
       true,
       '',
       '',
       true,
       3,
       now(),
       now()
WHERE NOT EXISTS (SELECT 1 FROM suggestion_boxes WHERE titolo = 'Offerte relative ai prodotti salvati');

INSERT INTO suggestion_boxes (titolo, prompt, n_articoli, pesi, solo_in_offerta, escludi_acquistati, scope_famiglia, scope_raccolta, attiva, ordinamento, creato_il, aggiornato_il)
SELECT 'Offerte Top',
       'prendi gli articoli in offerta più venduti, adatti agli interessi del cliente',
       10,
       '{"acquisti":0.4,"tracking":0.25,"progetti":0.2,"affinita":0.15}',
       true,
       true,
       '',
       '',
       true,
       4,
       now(),
       now()
WHERE NOT EXISTS (SELECT 1 FROM suggestion_boxes WHERE titolo = 'Offerte Top');

INSERT INTO suggestion_boxes (titolo, prompt, n_articoli, pesi, solo_in_offerta, escludi_acquistati, scope_famiglia, scope_raccolta, attiva, ordinamento, creato_il, aggiornato_il)
SELECT 'Offerte di oggi',
       'prendi gli articoli in offerta con la scadenza più vicina',
       10,
       '{"acquisti":0.4,"tracking":0.25,"progetti":0.2,"affinita":0.15}',
       true,
       true,
       '',
       '',
       true,
       5,
       now(),
       now()
WHERE NOT EXISTS (SELECT 1 FROM suggestion_boxes WHERE titolo = 'Offerte di oggi');

INSERT INTO suggestion_boxes (titolo, prompt, n_articoli, pesi, solo_in_offerta, escludi_acquistati, scope_famiglia, scope_raccolta, attiva, ordinamento, creato_il, aggiornato_il)
SELECT 'Offerte stagionali',
       'prendi gli articoli in offerta stagionali in linea con gli acquisti del cliente',
       10,
       '{"acquisti":0.4,"tracking":0.25,"progetti":0.2,"affinita":0.15}',
       true,
       true,
       '',
       '',
       true,
       6,
       now(),
       now()
WHERE NOT EXISTS (SELECT 1 FROM suggestion_boxes WHERE titolo = 'Offerte stagionali');