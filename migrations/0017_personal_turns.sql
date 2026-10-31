-- 既存武将は次回スケジューラ実行時に将来の登録時刻グリッドへ初期化する。
ALTER TABLE characters ADD COLUMN next_command_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX characters_next_command_at_idx ON characters(next_command_at);
CREATE TABLE turn_scheduler_lock (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  owner TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
