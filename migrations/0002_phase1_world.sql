-- Phase 1: 武将・家・令制国（中立）
-- icon_id は public/icons/{icon_id}.webp と対応する

CREATE TABLE houses (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  leader_character_id TEXT,
  color TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  destroyed_at INTEGER
);

CREATE TABLE provinces (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  house_id TEXT REFERENCES houses(id),
  population INTEGER NOT NULL,
  agriculture INTEGER NOT NULL,
  commerce INTEGER NOT NULL,
  defense INTEGER NOT NULL,
  garrison INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX provinces_house_id_idx ON provinces(house_id);

CREATE TABLE characters (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon_id TEXT NOT NULL,
  house_id TEXT REFERENCES houses(id),
  province_id TEXT NOT NULL REFERENCES provinces(id),
  rank INTEGER NOT NULL DEFAULT 1,
  merit INTEGER NOT NULL DEFAULT 0,
  money INTEGER NOT NULL DEFAULT 1000,
  troops INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX characters_house_id_idx ON characters(house_id);
CREATE INDEX characters_province_id_idx ON characters(province_id);

CREATE TABLE house_roles (
  id TEXT PRIMARY KEY NOT NULL,
  house_id TEXT NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (house_id, character_id)
);

CREATE INDEX house_roles_character_id_idx ON house_roles(character_id);
