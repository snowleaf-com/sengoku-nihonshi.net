-- Slice B: 給与按分用の貢献（鍛錬分を除く）

ALTER TABLE characters ADD COLUMN pay_merit INTEGER NOT NULL DEFAULT 0;

-- 既存データは当期 merit と同値でよい（鍛錬のみ判別は次の半期から）
UPDATE characters SET pay_merit = merit WHERE pay_merit = 0 AND merit != 0;
