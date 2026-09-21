-- N5: 国会議室・手紙・国法

CREATE TABLE house_messages (
  id TEXT PRIMARY KEY,
  house_id TEXT NOT NULL REFERENCES houses(id),
  character_id TEXT NOT NULL REFERENCES characters(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX house_messages_house_created_idx ON house_messages(house_id, created_at DESC);

CREATE TABLE personal_letters (
  id TEXT PRIMARY KEY,
  from_character_id TEXT NOT NULL REFERENCES characters(id),
  to_character_id TEXT NOT NULL REFERENCES characters(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);

CREATE INDEX personal_letters_to_created_idx ON personal_letters(to_character_id, created_at DESC);

ALTER TABLE houses ADD COLUMN law_text TEXT NOT NULL DEFAULT '';
