-- 実行結果（コマンド）と全国の出来事を分ける

ALTER TABLE world_events ADD COLUMN channel TEXT NOT NULL DEFAULT 'news';

UPDATE world_events SET channel = 'result' WHERE kind = 'command';

CREATE INDEX world_events_channel_created_at_idx
  ON world_events (channel, created_at DESC);
