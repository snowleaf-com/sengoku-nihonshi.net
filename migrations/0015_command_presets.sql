-- 名前付きコマンド定型（1武将あたり3枠）

CREATE TABLE command_presets (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters(id),
  slot INTEGER NOT NULL,
  name TEXT NOT NULL,
  steps_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (character_id, slot)
);
