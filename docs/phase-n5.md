# Phase N5 — 社会（会議室・手紙・国法・一覧）

目的: NET の情報系を載せ、**家の連携と武将比較**ができるようにする。  
式の詳細は [`net-spec.md`](./net-spec.md)。全体は [`roadmap.md`](./roadmap.md)。

## 完了条件

- [x] **国会議室**（`house_messages`。家メンバーのみ読書き）
- [x] **個人宛て手紙**（`personal_letters`。宛先は自分以外の全武将から選択）
- [x] **国法**（`houses.law_text`。表示は家メンバー、編集は当主のみ）
- [x] **武将一覧**（貢献 desc → 階級値 desc。名前・家・四能力・貢献・官位）
- [x] Hub 上部ナビ: 会議室 / 手紙 / 一覧
- [x] ルート: `/game/house` `/game/letters` `/game/ranking`（`requireAuth`）
- [x] 本文 1〜200 文字（trim。空は拒否）
- [x] テスト（投稿・他家拒否・国法・手紙・ランキング）

## やらない

- 外部 BBS 連携
- 部隊チャットの本格分離（→ N6）
- 手紙の既読 UI（`read_at` 列は用意）
