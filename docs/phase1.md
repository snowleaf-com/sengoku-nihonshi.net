# Phase 1

目的: **認証済みユーザーが武将を立て、令制国の盤面に入り、建国または仕官できる**ようにする。

## 完了条件

- [x] `characters` / `houses` / `provinces` / `house_roles` テーブル
- [x] Province Master（静的）と中立国シード
- [x] 8方向隣接判定
- [x] 武将作成（名前 + アイコン → 地図で国選択 → 戦国の世へ）
- [x] 中立選択 = 建国、支配国選択 = 仕官の出し分け
- [x] 全国マップ表示
- [x] `/game` が武将未作成 / 本編で分岐

## UX

```text
Passkey ログイン
  → 武将なし: 武将名 + アイコン + 地図で国を選ぶ
       ├ 中立国 → 家名入力 → 建国して戦国の世へ（当主）
       └ 支配国 → 仕官して戦国の世へ（家臣）
  → 武将あり: 顔アイコン・所在国・全国マップ
```

## やらない（Phase 2 以降）

- コマンド予約・Cron・ターン進行
- 農業/商業/徴兵などの内政実行
- 移動・侵攻・戦闘
- 下野・仕官コマンド（登録時以外）
- 滅亡・天下統一

## 設計メモ

- 1 User = 1 Character（`characters.user_id` UNIQUE）
- `characters.icon_id` は `public/icons/{id}.webp`（`src/config/icons.ts`）
- 国マスターは `src/config/provinces.ts` が単一の真実。DB は実行時シード
- 隣接は座標の8方向。史実の海岸線よりゲーム盤を優先
- 入口の分岐は選択国の `house_id` でサーバー側が確定する
- 地図選択の UI 出し分けは HTMX（`/game/fragments/enter-path`）
- 旗揚げ action は浪人救済用に残す（通常の新規は `enterWorld`）
