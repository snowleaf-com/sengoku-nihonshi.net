# Phase 0

目的: **ゲーム本体より先に、安全に開発を進められる土台**を作る。

## 完了していること

- [x] Hono + Cloudflare Workers + Vite + TypeScript
- [x] Hono JSX + HTMX 読み込み
- [x] D1 + migrations（local / remote）
- [x] Passkey 登録・ログイン（SimpleWebAuthn）
- [x] 長期 session（D1 + HttpOnly Cookie）
- [x] users / passkeys / sessions
- [x] 認証 middleware、ログアウト
- [x] `/game` 保護（武将作成前プレースホルダ）
- [x] test / lint / typecheck
- [x] Cloudflare への deploy

## 意図的にやっていないこと

- 武将作成（名前入力 → 戦国の世へ）の本実装 → Phase 1
- 令制国マップ・家・旗揚げ
- コマンド予約・Cron・Turn Engine
- 戦闘・滅亡・天下統一
- Passkey 復旧 UI / 追加 Passkey UI
- OAuth / メール

## UX（Phase 0）

```text
トップ
  [パスキーで始める] → 登録 → session → /game（武将作成前）
  [ログイン]         → 認証 → session → /game

/game
  ユーザー識別情報の表示
  [ログアウト]
```

メール必須フォームもパスワードもない。

## 次（Phase 1 の入口）

1. [x] `characters` テーブル（名前 + `icon_id`、1 User = 1 Character）
2. [x] 武将作成画面（名前入力 + アイコン選択）
3. [ ] Province master / 全国マップの静的データ
4. [ ] `/game` を本編入口（コマンド・国取り）に育てる

武将アイコンは `public/icons/busho_*.webp`（現状 13〜36）。追加分が来たら `src/config/icons.ts` に足す。

詳細なゲーム仕様はリポジトリ直下の開発仕様、および今後の Phase 文書へ。
