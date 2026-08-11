INSERT INTO site_config (key, value, created_at, updated_at)
VALUES ('banner_spedizione_attivo', 'true', now(), now())
ON CONFLICT (key) DO NOTHING;
