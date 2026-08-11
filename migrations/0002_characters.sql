-- Phase 1 入口: 武将（1 User = 1 Character）
-- icon_id は public/icons/{icon_id}.webp と対応する

CREATE TABLE characters (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX characters_user_id_idx ON characters(user_id);
