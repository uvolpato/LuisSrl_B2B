ALTER TABLE "audit_log" ADD COLUMN "request_id" TEXT;
ALTER TABLE "audit_log" ADD COLUMN "duration_ms" INTEGER;

INSERT INTO audit_log (actor_id, actor_type, azione, entita, entita_id, dettagli, esito, ip, request_id, duration_ms, created_at)
SELECT
  actor_id,
  actor_type,
  CASE event_type
    WHEN 'access' THEN 'http.access'
    WHEN 'error' THEN 'http.error'
    WHEN 'mutation' THEN 'evt.mutation'
    WHEN 'business' THEN 'evt.business'
    WHEN 'sync' THEN 'evt.sync'
    ELSE 'evt.' || event_type
  END,
  COALESCE(entity, 'http'),
  entity_id,
  COALESCE(data, '{}'::jsonb) || jsonb_build_object('label', action),
  CASE WHEN status = 'error' THEN 'KO' ELSE 'OK' END,
  ip,
  request_id,
  duration_ms,
  created_at
FROM event_log;

DROP TABLE event_log;
