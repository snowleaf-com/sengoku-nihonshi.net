# アーキテクチャ

## 方針

- **Server Driven UI**: 画面の主は Hono JSX。SPA / React は Phase 0 では使わない
- **部分更新**: 将来のゲーム UI は HTMX で HTML Fragment を差し替える
- **認証だけは Vanilla TS**: `navigator.credentials.*` はブラウザ必須のため `src/client/passkey.ts`
- **Domain 分離の芽**: Repository で D1 を隠す。ゲームロジックは Phase 1 以降 `domain/` へ

## リクエストの流れ

```text
Browser
  │  通常ページ: GET → Hono JSX（フル HTML）
  │  Passkey:   fetch JSON ↔ /auth/*
  │  将来 UI:   HTMX → HTML Fragment
  ▼
Cloudflare Worker (Hono)
  ├─ middleware: session 解決 / 認証必須
  ├─ routes/pages: 画面
  ├─ routes/auth: Passkey + logout
  ├─ auth/passkey: SimpleWebAuthn
  ├─ auth/session: Cookie ↔ D1 sessions
  └─ repositories → D1
```

## ディレクトリ

```text
src/
├─ index.tsx              # エントリ・ルーティング
├─ renderer.tsx           # 共通 HTML 殻（CSS / HTMX / client）
├─ style.css
├─ client/passkey.ts      # ブラウザ側 WebAuthn
├─ routes/
│  ├─ pages/              # /, /login, /game
│  └─ auth/               # register/login/logout API
├─ auth/
│  ├─ passkey/            # options 生成・検証
│  └─ session/            # 発行・読込・破棄
├─ middleware/auth.ts
├─ repositories/          # users / passkeys / sessions / challenges
├─ config/auth.ts
└─ types.ts

migrations/               # D1 SQL
docs/                     # この文書群
test/                     # Workers 上の Vitest
```

## レイヤの約束

| レイヤ | やってよいこと | やらないこと |
|--------|----------------|--------------|
| routes | HTTP・HTML/JSON・入力の薄い検証 | SQL 直書き、暗号詳細 |
| auth/* | WebAuthn / session のユースケース | 画面文言の大量ハードコード |
| repositories | D1 の CRUD | Cookie 操作、WebAuthn 検証 |
| client | ブラウザ API・fetch | 秘密鍵や DB 資格情報 |

## 認証後の画面ガード

```text
未ログインで /game → /
ログイン済みで / や /login → /game
```

アカウント切替 UI は提供しない。長期セッションで「同じ端末はずっと同じ user」を基本にする。
