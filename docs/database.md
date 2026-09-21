# データベース（Phase 0）

Cloudflare D1（SQLite）。migration は `migrations/`。

```bash
npm run db:migrate:local
npm run db:migrate:staging
npm run db:migrate:production
```

local / staging / production は **別 D1**。デプロイでは未適用 migration だけ当て、データは消さない。

## ER 概略

```text
users 1───* passkeys
  │
  └───* sessions

webauthn_challenges   （短命・user に依存しない行もあり）
```

User と Character（武将）は **別 entity**。Phase 0 では Character テーブル未作成。

## テーブル

### users

認証主体。メールもパスワードも持たない。

| 列 | 意味 |
|----|------|
| id | 主キー（登録時に発行した仮 id を確定） |
| created_at / updated_at | unix 秒 |
| last_login_at | 最終ログイン |

### passkeys

WebAuthn 資格情報。秘密鍵は保存しない。

| 列 | 意味 |
|----|------|
| id | credential id（base64url） |
| user_id | 所有者 |
| webauthn_user_id | userHandle |
| public_key | BLOB |
| counter | 認証カウンタ |
| device_type / backed_up / transports | Authenticator メタデータ |
| created_at / last_used_at | |

1 user に複数行を許容（追加 Passkey 用）。

### sessions

長期ログイン。

| 列 | 意味 |
|----|------|
| id | Cookie に載せる opaque id |
| user_id | |
| expires_at | |
| created_at | |

### webauthn_challenges

登録・認証の challenge 一時保存。

| 列 | 意味 |
|----|------|
| type | `registration` / `authentication` |
| challenge | |
| user_id / webauthn_user_id | 登録時の仮紐付け |
| expires_at | 短命 |

verify 成功後に削除。期限切れ行は読み時に無効扱い（掃除は将来 Cron でも可）。

## Repository

SQL は `src/repositories/*` に閉じる。ルートや Passkey モジュールから D1 の生クエリを散らかさない。

## Phase 1 で追加

`houses` / `provinces` / `characters` / `house_roles`（migration `0002_phase1_world.sql`）。

- `characters.icon_id` は `public/icons/{icon_id}.webp` と対応
- `provinces` の初期行はマスター（`src/config/provinces.ts`）から実行時シード
- `characters.user_id` は UNIQUE（MVP で 1 User = 1 Character）

## Phase 1.5 で追加

migration `0003_phase1_5_stats.sql`。

- `archetype_id` … 立ち回り（battle / domestic / strategy / command）
- `buyu` / `chiryaku` / `toso` / `tokubo` … 武勇・知略・統率・徳望（入力は前3つ、各5〜100・合計150。徳望は立ち回り固定）

## Phase 2 で追加

migration `0004_phase2_turns.sql`。

- `game_state` … 年月・ターン番号・次ターン時刻
- `provinces.loyalty` … 民忠
- `characters.rice` / `*_ex` … 米と能力経験値
- `character_commands` … コマンド予約キュー

migration `0005_world_events.sql`。

- `world_events` … 全国の出来事 / 実行結果ログ
  - `channel=news` … 仕官・旗揚げ・税収・戦・災など（地図下）
  - `channel=result` … 自分のコマンド実行結果（コマンド欄下）

## Phase N1 で追加

migration `0007_n1_net_domestic.sql`。

- 都市上限: `agriculture_max` / `commerce_max` / `defense_max` / `population_max`
- `tech` / `market_rate`（相場は N2 で本使用）
- `characters.class_points` … 階級値（貢献は `merit` のまま・季節でリセット）

## Phase N2 で追加

migration `0008_n2_command_payload.sql`。

- `character_commands.payload` … 移動先・売買量の JSON

## Phase N3 で追加

migration `0009_n3_military.sql`。

- `characters.training` … 訓練度（0〜100）
- `characters.defending` … 城の守備中なら 1

## Phase N4 で追加

migration `0010_n4_war.sql`。

- `houses.founded_turn` … 建国時の `game_state.turn_index`（戦争解禁の基準）

## Phase N5 で追加

migration `0011_n5_social.sql`。

- `house_messages` … 国会議室（家メンバーのみ）
- `personal_letters` … 個人宛て手紙
- `houses.law_text` … 国法（当主が編集）

## Phase N6 で追加

migration `0012_n6_finish.sql`。

- `units` / `unit_members` … 部隊（家単位。隊長＋隊員）
- `characters.idle_streak` … 「何もしない」連続回数（60 で削除）
- `characters.loyalty` … 武将の国への忠誠（都市の民忠とは別。既定 100）
- `game_state.maintenance` … メンテ中フラグ（コマンド投稿を止める）
