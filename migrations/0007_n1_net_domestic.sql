-- N1: NET内政寄せ（上限・技術・相場値・相場）

ALTER TABLE provinces ADD COLUMN agriculture_max INTEGER NOT NULL DEFAULT 0;
ALTER TABLE provinces ADD COLUMN commerce_max INTEGER NOT NULL DEFAULT 0;
ALTER TABLE provinces ADD COLUMN defense_max INTEGER NOT NULL DEFAULT 0;
ALTER TABLE provinces ADD COLUMN population_max INTEGER NOT NULL DEFAULT 30000;
ALTER TABLE provinces ADD COLUMN tech INTEGER NOT NULL DEFAULT 0;
ALTER TABLE provinces ADD COLUMN market_rate REAL NOT NULL DEFAULT 1.0;

-- 既存行: 上限が未設定なら現状の 1.5 倍（最低でも現状値）
UPDATE provinces SET
  agriculture_max = CASE
    WHEN agriculture_max <= 0 THEN MAX(agriculture, CAST(agriculture * 1.5 AS INTEGER))
    ELSE agriculture_max
  END,
  commerce_max = CASE
    WHEN commerce_max <= 0 THEN MAX(commerce, CAST(commerce * 1.5 AS INTEGER))
    ELSE commerce_max
  END,
  defense_max = CASE
    WHEN defense_max <= 0 THEN MAX(defense, CAST(defense * 1.5 AS INTEGER))
    ELSE defense_max
  END,
  population_max = CASE
    WHEN population_max <= 0 THEN 30000
    ELSE population_max
  END;

-- 農民スケールを NET 寄りに（すでに大きい国はそのまま）
UPDATE provinces
SET population = MIN(population * 10, population_max)
WHERE population > 0 AND population < 2000;

ALTER TABLE characters ADD COLUMN class_points INTEGER NOT NULL DEFAULT 0;
