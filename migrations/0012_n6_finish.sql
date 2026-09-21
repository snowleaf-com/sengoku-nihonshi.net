-- N6: 部隊・忠誠・放置削除・メンテ

CREATE TABLE units (
  id TEXT PRIMARY KEY,
  house_id TEXT NOT NULL,
  name TEXT NOT NULL,
  leader_character_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX units_house_idx ON units(house_id);
CREATE INDEX units_leader_idx ON units(leader_character_id);

CREATE TABLE unit_members (
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL UNIQUE,
  PRIMARY KEY (unit_id, character_id)
);

ALTER TABLE characters ADD COLUMN idle_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN loyalty INTEGER NOT NULL DEFAULT 100;

ALTER TABLE game_state ADD COLUMN maintenance INTEGER NOT NULL DEFAULT 0;
