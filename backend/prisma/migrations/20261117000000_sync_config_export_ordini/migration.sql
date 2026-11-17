-- L'export ordini verso Integra diventa una voce di sync_config come le altre:
-- stessa UI (attiva/disattiva, cron, esegui), stesso storico in sync_log.
-- Additivo e idempotente.
INSERT INTO sync_config (tipo, label, cron_expression, attivo, solo_manuale, aggiornato_il)
SELECT 'export_ordini', 'Esportazione ordini → Integra', '0 */10 * * * *', true, false, now()
WHERE NOT EXISTS (SELECT 1 FROM sync_config WHERE tipo = 'export_ordini');
