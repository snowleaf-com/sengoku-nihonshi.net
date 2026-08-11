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

## 次

→ [phase1.md](./phase1.md)
