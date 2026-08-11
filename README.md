# 戦国日本史.net

日本の戦国時代・令制国を舞台にした、非同期オンライン戦略ゲーム。

技術スタックの中心は **Cloudflare Workers / Hono / D1 / HTMX / Passkey**。

## 必要環境

- Node.js **22+**（`.nvmrc` あり）
- npm
- Cloudflare アカウント（deploy / remote D1 時）
- Passkey 対応ブラウザ（Safari / Chrome 等）と生体認証または端末 PIN

```bash
nvm use
npm install
```

## ローカル起動

```bash
# 初回、または migrations/ を追加したあと
npm run db:migrate:local

# 開発サーバー
npm run dev
```

ブラウザで [http://localhost:5173/](http://localhost:5173/) を開く。

ローカル用の WebAuthn 設定は `.dev.vars`（雛形は `.dev.vars.example`）。

```text
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:5173
```

## よく使うコマンド

| コマンド | 内容 |
|----------|------|
| `npm run dev` | ローカル開発（Vite + Workers runtime） |
| `npm run db:migrate:local` | ローカル D1 に migration 適用 |
| `npm run db:migrate:remote` | リモート D1 に migration 適用 |
| `npm run test` | Vitest（Workers pool） |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | 本番ビルド |
| `npm run deploy` | ビルドして Workers にデプロイ |
| `npm run preview:upload` | 本番トラフィックに載せない version preview |
| `npm run cf-typegen` | `worker-configuration.d.ts` 再生成 |

## ドキュメント

詳細は [`docs/`](./docs/) を参照。

| 文書 | 内容 |
|------|------|
| [docs/README.md](./docs/README.md) | ドキュメント一覧 |
| [docs/development.md](./docs/development.md) | 開発・デプロイ手順 |
| [docs/architecture.md](./docs/architecture.md) | 全体構成 |
| [docs/passkey.md](./docs/passkey.md) | Passkey / WebAuthn の流れ |
| [docs/session.md](./docs/session.md) | 長期セッション設計 |
| [docs/database.md](./docs/database.md) | D1 スキーマ |
| [docs/phase0.md](./docs/phase0.md) | Phase 0 の範囲と完了条件 |

## 現在のマイルストーン

**Phase 0（開発基盤）完了** / **Phase 1 入口（武将作成）着手**

- Passkey 登録 / ログイン
- D1 session（長期・アカウント切替なし）
- `/game` 認証保護
- 武将作成（名前 + アイコン選択、`characters`）

ゲーム本体（国・コマンド・ターン）は以降のフェーズ。
