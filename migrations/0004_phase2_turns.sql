-- Phase 2: ターン進行・民忠・米・コマンド予約

CREATE TABLE game_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  turn_index INTEGER NOT NULL,
  next_turn_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO game_state (id, year, month, turn_index, next_turn_at, updated_at)
VALUES (1, 1467, 1, 0, 0, 0);

ALTER TABLE provinces ADD COLUMN loyalty INTEGER NOT NULL DEFAULT 50;

ALTER TABLE characters ADD COLUMN rice INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE characters ADD COLUMN buyu_ex INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN chiryaku_ex INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN toso_ex INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN tokubo_ex INTEGER NOT NULL DEFAULT 0;

CREATE TABLE character_commands (
  id TEXT PRIMARY KEY NOT NULL,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  command_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX character_commands_character_position_idx
  ON character_commands (character_id, position);
