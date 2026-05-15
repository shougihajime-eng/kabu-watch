-- kabu-watch: AI picks + paper trading + snapshots
-- 「AIが注目した銘柄」と「エア取引」を記録し、後で成績を検証するためのテーブル群。

-- AIが選んだ注目銘柄
CREATE TABLE IF NOT EXISTS kabu_watch.ai_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('jp', 'us')),
  name TEXT NOT NULL,
  picked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_at_pick NUMERIC,                     -- 注目した瞬間の株価
  confidence NUMERIC NOT NULL,               -- 自信度 0-100
  risk_level TEXT NOT NULL,                  -- low / medium / high
  horizon TEXT NOT NULL,                     -- short(短期) / long(中長期)
  rationale TEXT NOT NULL,                   -- 注目理由（初心者向けの日本語）
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,-- 内部スコアの内訳
  rank INTEGER NOT NULL DEFAULT 1,           -- その日の順位（1=最注目）
  sector TEXT,
  engine_version TEXT NOT NULL DEFAULT 'rule-v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_picks_picked_idx ON kabu_watch.ai_picks (picked_at DESC);
CREATE INDEX IF NOT EXISTS ai_picks_ticker_idx ON kabu_watch.ai_picks (ticker);

-- 注目後の値動きスナップショット（1日後 / 3日後 / 1週間後 / 1か月後）
CREATE TABLE IF NOT EXISTS kabu_watch.pick_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_id UUID NOT NULL REFERENCES kabu_watch.ai_picks(id) ON DELETE CASCADE,
  horizon_days INTEGER NOT NULL,             -- 1, 3, 7, 30
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  price NUMERIC,
  change_pct NUMERIC,                        -- 注目時点比の上昇率(%)
  UNIQUE (pick_id, horizon_days)
);
CREATE INDEX IF NOT EXISTS pick_snapshots_pick_idx ON kabu_watch.pick_snapshots (pick_id);

-- エア取引（仮想売買）
CREATE TABLE IF NOT EXISTS kabu_watch.paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('jp', 'us')),
  name TEXT NOT NULL,
  shares NUMERIC NOT NULL,
  buy_price NUMERIC NOT NULL,
  buy_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sell_price NUMERIC,
  sell_at TIMESTAMPTZ,
  pick_id UUID REFERENCES kabu_watch.ai_picks(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS paper_trades_status_idx ON kabu_watch.paper_trades (status);
CREATE INDEX IF NOT EXISTS paper_trades_ticker_idx ON kabu_watch.paper_trades (ticker);
CREATE INDEX IF NOT EXISTS paper_trades_pick_idx ON kabu_watch.paper_trades (pick_id);

DROP TRIGGER IF EXISTS paper_trades_touch_updated ON kabu_watch.paper_trades;
CREATE TRIGGER paper_trades_touch_updated
  BEFORE UPDATE ON kabu_watch.paper_trades
  FOR EACH ROW EXECUTE FUNCTION kabu_watch.touch_updated_at();

-- RLS: enable but no policies => service_role only
ALTER TABLE kabu_watch.ai_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kabu_watch.pick_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kabu_watch.paper_trades ENABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA kabu_watch TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA kabu_watch TO service_role;
