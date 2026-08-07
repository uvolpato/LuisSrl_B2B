-- Aggiungi sync_config per lookup
INSERT INTO sync_config (tipo, label, cron_expression, attivo, solo_manuale, aggiornato_il)
VALUES ('lookup', 'Sincronizza lookup (pagamenti, porti, spedizioni, vettori)', '0 0 * * * *', true, false, NOW())
ON CONFLICT (tipo) DO NOTHING;

-- Aggiungi site_config per checkout
INSERT INTO site_config (key, value, updated_at)
VALUES ('checkout_allow_new_address', 'true', NOW())
ON CONFLICT (key) DO UPDATE SET value='true', updated_at=NOW();

-- Aggiungi site_config per listino default
INSERT INTO site_config (key, value, updated_at)
VALUES ('checkout_default_listino', 'LIS1', NOW())
ON CONFLICT (key) DO UPDATE SET value='LIS1', updated_at=NOW();
