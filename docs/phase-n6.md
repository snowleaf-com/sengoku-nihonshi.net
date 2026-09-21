# Phase N6 — 仕上げ・NET残り

目的: 原本にあって未移植だった **鍛錬・登用・部隊・災厄・放置削除・忠誠・管理** を MVP で埋める。  
式の詳細は [`net-spec.md`](./net-spec.md)。全体は [`roadmap.md`](./roadmap.md)。

## 完了条件

- [x] **鍛錬**（`tanren`。payload `train_stat`。金50・EX+2・貢献+10・自国のみ）
- [x] **登用**（`touyou`。payload `recruit_officer`。金100・同国他家/浪人。成功時家臣化＋ニュース）
- [x] **部隊**（`units` / `unit_members`。作成・参加・離脱・`syuugou` 集合）
- [x] **災厄**（1月/7月に約 1/40。全国一律。`world_events.kind=disaster`）
- [x] **何もしない**（`nashi`。`idle_streak`。60 で武将削除。当主なら家滅亡）
- [x] **忠誠**（`characters.loyalty`。他国滞在で月 -1。登用成功条件にも利用）
- [x] **管理**（`/admin` + `ADMIN_SECRET`。メンテ切替・ターン強制進行）
- [x] Hub: 部隊名・忠誠表示。メンテ時バナー＆コマンド投稿ブロック
- [x] テスト `test/phase-n6.test.ts`

## やらない

- 部隊チャットの本格分離
- 天下統一リセット演出
- 管理画面のフル機能（リセット一式など）
