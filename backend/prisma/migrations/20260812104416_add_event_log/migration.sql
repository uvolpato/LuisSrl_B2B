CREATE TABLE event_log (
  id          SERIAL PRIMARY KEY,
  event_type  TEXT NOT NULL,
  action      TEXT NOT NULL,
  actor_id    INTEGER,
  actor_type  TEXT,
  entity      TEXT,
  entity_id   TEXT,
  data        JSONB,
  request_id  TEXT,
  session_id  TEXT,
  ip          TEXT,
  user_agent  TEXT,
  status      TEXT NOT NULL DEFAULT 'ok',
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_type_time ON event_log(event_type, created_at);
CREATE INDEX idx_actor_time ON event_log(actor_id, created_at);
CREATE INDEX idx_entity ON event_log(entity, entity_id);
CREATE INDEX idx_request_id ON event_log(request_id);
