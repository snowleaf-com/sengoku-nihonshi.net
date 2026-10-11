-- 滅亡後、勝者の家へ仕官／登用したときの帰順特典用

ALTER TABLE characters ADD COLUMN fallen_to_house_id TEXT;
ALTER TABLE characters ADD COLUMN fallen_at_turn INTEGER;
