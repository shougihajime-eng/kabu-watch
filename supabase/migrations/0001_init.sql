-- kabu-watch schema initial migration
CREATE SCHEMA IF NOT EXISTS kabu_watch;

-- Groups (folders to organize tickers)
CREATE TABLE IF NOT EXISTS kabu_watch.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Watchlist items
CREATE TABLE IF NOT EXISTS kabu_watch.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('jp', 'us')),
  name TEXT NOT NULL,
  group_id UUID REFERENCES kabu_watch.groups(id) ON DELETE SET NULL,
  memo TEXT NOT NULL DEFAULT '',
  alert_low NUMERIC,
  alert_high NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS watchlist_ticker_unique ON kabu_watch.watchlist (ticker);
CREATE INDEX IF NOT EXISTS watchlist_group_idx ON kabu_watch.watchlist (group_id);
CREATE INDEX IF NOT EXISTS groups_sort_idx ON kabu_watch.groups (sort_order);

-- updated_at trigger
CREATE OR REPLACE FUNCTION kabu_watch.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS watchlist_touch_updated ON kabu_watch.watchlist;
CREATE TRIGGER watchlist_touch_updated
  BEFORE UPDATE ON kabu_watch.watchlist
  FOR EACH ROW EXECUTE FUNCTION kabu_watch.touch_updated_at();

-- RLS: enable but no policies => only service_role bypasses
ALTER TABLE kabu_watch.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE kabu_watch.groups ENABLE ROW LEVEL SECURITY;

-- Grant usage on schema for service_role and authenticated (so future migrations can attach policies if desired)
GRANT USAGE ON SCHEMA kabu_watch TO service_role, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA kabu_watch TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA kabu_watch TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA kabu_watch GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA kabu_watch GRANT ALL ON SEQUENCES TO service_role;
