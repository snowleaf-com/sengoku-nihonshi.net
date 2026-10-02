-- 国貢献: 税金・年貢の按分用。鍛錬の貢献（merit）とは分ける。

ALTER TABLE characters ADD COLUMN country_merit INTEGER NOT NULL DEFAULT 0;
