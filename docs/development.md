# 開発・デプロイ

## 前提

- Node.js 22+（`nvm use` で `.nvmrc` に合わせる）
- 初回は `npm install`
- Wrangler ログイン済みであること（`npx wrangler whoami`）

## ローカル開発

```bash
nvm use
npm install
npm run db:migrate:local
npm run dev
```

- URL: http://localhost:5173/
- runtime: `@cloudflare/vite-plugin` 経由で Workers 相当
- DB: ローカル D1（`.wrangler/state`）。本番データとは分離

### Passkey を試す

1. トップで「パスキーで始める」
2. 端末の Face ID / Touch ID / Windows Hello / PIN 等
3. `/game`（武将作成前）へ遷移
4. ログアウト → 「ログイン」で同一ユーザーに戻れること

`localhost` は WebAuthn の特例として HTTPS なしでも可。`127.0.0.1` で開くと `rpID=localhost` と食い違うことがあるので、**hostname は `localhost` を使う**。

## 環境変数

| 名前 | 役割 | local | production |
|------|------|-------|------------|
| `WEBAUTHN_RP_ID` | Relying Party ID | `.dev.vars` → `localhost` | `wrangler.jsonc` vars（workers.dev ホスト名） |
| `WEBAUTHN_ORIGIN` | 期待 origin | `http://localhost:5173` | `https://…workers.dev` |
| `WEBAUTHN_RP_NAME` | 認証 UI に出る名前 | 共通 | 共通 |
| `SESSION_TTL_SECONDS` | セッション寿命（秒） | 既定 180 日 | 同 |

- local: `.dev.vars`（git 管理外）。雛形は `.dev.vars.example`
- remote: `wrangler.jsonc` の `vars`
- 型: `npm run cf-typegen` で `worker-configuration.d.ts` を更新

## チェック

```bash
npm run test
npm run lint
npm run typecheck
```

PR / `main` への push では GitHub Actions（`.github/workflows/ci.yml`）が同じ3つを実行する。  
テストは `@cloudflare/vitest-pool-workers` 経由で **workerd（Workers ランタイム）** 上で動く。`.dev.vars` は不要（必要な binding は `vitest.config.ts` 側で渡している）。

Cloudflare Workers Builds を使う場合は、Build command に例えば次を設定する:

```bash
npm test && npm run build
```

## デプロイ

```bash
# migration を先にリモートへ
npm run db:migrate:remote

# 本番トラフィックへ
npm run deploy
```

Preview（本番に載せない version）:

```bash
npm run preview:upload
```

注意: versioned preview URL（`{versionId}-…workers.dev`）はホスト名が本番と違う。  
Passkey の `WEBAUTHN_RP_ID` は安定 URL 向けなので、**パスキー確認は安定な workers.dev（または将来の独自ドメイン）で行う**。

## トラブルシュート

| 症状 | 確認 |
|------|------|
| Node / wrangler が落ちる | `node -v` が 22 以上か |
| Passkey が即失敗 | 開いている URL の host と `WEBAUTHN_RP_ID` が一致しているか。ローカルはポートが 5174 等にずれても可（`Origin` ヘッダで許可） |
| `/game` に入れない | Cookie が付いているか。別 host / 別ポートだと別サイト扱い |
| migration 忘れ | `npm run db:migrate:local` |
| 型エラー（Bindings） | `npm run cf-typegen` |
