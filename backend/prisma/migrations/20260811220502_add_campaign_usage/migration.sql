CREATE TABLE campaign_usage (
  id          SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL,
  used_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, customer_id)
);
