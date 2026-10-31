# 開発・デプロイ

> **予定:** Cloudflare は Wrangler 後継として `cf` CLI をオープンベータ中。  
> 方針は [`issue/30.md`](./issue/30.md)、進捗は [`impl.md`](./impl.md) の Slice T。  
> 移行完了までは本ページの `wrangler` 手順が正。

## 前提

- Node.js 22+（`nvm use` で `.nvmrc` に合わせる）
- 初回は `npm install`
- Wrangler ログイン済みであること（`npx wrangler whoami`）

## 環境の分け方

| 環境 | URL / 場所 | DB | 反映タイミング |
|------|------------|-----|----------------|
| local | http://localhost:5173/ | ローカル D1（`.wrangler/state`） | `npm run dev` で即時 |
| **staging** | https://sengoku-nihonshi-net-staging.yy-dec5.workers.dev | D1 `sengoku-nihonshi-staging` | `main` へ push / マージ後に CI が自動。ターン間隔 **60秒** |
| production | https://sengoku.snow-leaf.com | D1 `sengoku-nihonshi` | **手動** `npm run deploy:production`。ターン間隔 **1800秒（30分）** |

staging と production の DB は別物。デプロイで中身は消さない（未適用 migration だけ適用）。

## ローカル開発

```bash
nvm use
npm install
npm run db:migrate:local
npm run dev
```

- runtime: `@cloudflare/vite-plugin` 経由で Workers 相当
- Passkey: hostname は **`localhost`**（`127.0.0.1` は RP ID と食い違うことがある）

### Passkey を試す

1. トップで「パスキーで始める」
2. 端末の Face ID / Touch ID / Windows Hello / PIN 等
3. `/game`（武将作成前）へ遷移
4. ログアウト → 「ログイン」で同一ユーザーに戻れること

## 環境変数

| 名前 | 役割 | local | staging / production |
|------|------|-------|----------------------|
| `WEBAUTHN_RP_ID` | Relying Party ID | `.dev.vars` → `localhost` | `wrangler.jsonc` の各 env `vars` |
| `WEBAUTHN_ORIGIN` | 期待 origin | `http://localhost:5173` | staging=workers.dev / production=`https://sengoku.snow-leaf.com` |
| `WEBAUTHN_RP_NAME` | 認証 UI に出る名前 | 共通 | staging は名前に `(staging)` |
| `SESSION_TTL_SECONDS` | セッション寿命（秒） | 既定 180 日 | 同 |
| `ADMIN_SECRET` | `/admin` 用 | `.dev.vars` | `wrangler secret put`（env ごと） |

- local: `.dev.vars`（git 管理外）。雛形は `.dev.vars.example`
- remote vars: `wrangler.jsonc`（bindings は env 間で inherit されない）
- 型: `npm run cf-typegen` で `worker-configuration.d.ts` を更新

## チェック

```bash
npm run test
npm run lint
npm run typecheck
```

PR では GitHub Actions が上記3つを実行する。  
`main` への push では続けて **staging へ migrate + deploy** する。

テストは `@cloudflare/vitest-pool-workers` 経由で **workerd** 上で動く。

## デプロイ

### staging（普段ここ）

```bash
# 手元から送る場合
npm run deploy:staging
```

CI（`main`）でも同じ `npm run deploy:staging` を実行する。  
必要な GitHub Secrets:

- `CLOUDFLARE_API_TOKEN`（Workers / D1 編集権限）
- `CLOUDFLARE_ACCOUNT_ID`（`c9bae2855763259221d466e4e926ac59`）

初回だけ staging の管理秘密を入れる:

```bash
npx wrangler secret put ADMIN_SECRET --env staging
```

### production（良いと見たら手動）

GitHub Actions の CI を **workflow_dispatch** で起動すると、check のあと本番へ `npm run deploy:production` する。main への push では staging のみ。

```bash
npm run deploy:production
# 必要なら
npx wrangler secret put ADMIN_SECRET
```

DB を消してやり直したいときはデプロイに混ぜず、**意図的なリセット作業**として別途やる（毎デプロイでは消さない）。

Preview（本番トラフィックに載せない version）:

```bash
npm run preview:upload
```

注意: versioned preview URL はホスト名が安定 URL と違う。  
Passkey 確認は **staging の workers.dev** か **production の `sengoku.snow-leaf.com`** で行う（RP ID とホストが一致していること）。  
production の `*.workers.dev` は残っていても、Passkey はカスタムドメイン向け設定のためそちらでは失敗する。

注意: `routes`（custom domain）は Wrangler で **env に inherit される**。staging 側で `routes: []` を明示しないと、staging デプロイが本番ドメインを奪い、RP ID 不一致で Passkey が壊れる。

## トラブルシュート

| 症状 | 確認 |
|------|------|
| Node / wrangler が落ちる | `node -v` が 22 以上か |
| Passkey が即失敗 | 開いている URL の host と `WEBAUTHN_RP_ID` が一致しているか |
| `/game` に入れない | Cookie が付いているか。別 host だと別サイト扱い |
| migration 忘れ | local: `db:migrate:local` / staging: `db:migrate:staging` / prod: `db:migrate:production` |
| CI の deploy が失敗 | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` がセットされているか |
| 型エラー（Bindings） | `npm run cf-typegen` |

## 本番の世界時計・個人時計

本番の1800秒制は、月更新・税金・年貢を毎時00分／30分、個人コマンドを武将登録時刻から30分ごとに実行する。stagingの60秒制は従来の一斉実行。

`0017_personal_turns.sql` は既存武将の個人時計を未初期化（0）で追加する。新コードの初回進行時に登録時刻グリッド上の未来の時刻を設定し、導入前の未処理期間は一括実行しない。世界時計は既存の次回予定を半時境界へ切り上げる。通常のdeployスクリプトはmigration→deployの順なので、追加の手動データ更新は不要。

遅延時は予定時刻順に最大24組まで処理し、残りは次回呼び出しで継続する。次回予定が過去なら追いつき中。管理者の強制進行は本番では世界のみ1月進め、個人の予定は前倒ししない。詳細は [Issue #32方針](./issue/32.md)。
