-- N4: 建国ターン（戦争解禁の基準）

ALTER TABLE houses ADD COLUMN founded_turn INTEGER NOT NULL DEFAULT 0;
