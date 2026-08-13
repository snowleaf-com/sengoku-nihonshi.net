-- Phase 2: 全国の出来事ログ（地図下の知らせ）

CREATE TABLE world_events (
  id TEXT PRIMARY KEY NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  province_id TEXT,
  character_id TEXT,
  house_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX world_events_created_at_idx ON world_events (created_at DESC);
CREATE INDEX world_events_ym_idx ON world_events (year DESC, month DESC, created_at DESC);
