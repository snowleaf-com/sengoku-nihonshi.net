# docs

戦国日本史.net の設計・運用メモ。

コードを読む前の地図として使う。実装の「なぜ」はここ、細部はソースとコメントを優先する。

## 一覧

| ファイル | 内容 |
|----------|------|
| [development.md](./development.md) | ローカル起動、環境変数、デプロイ、トラブルシュート |
| [architecture.md](./architecture.md) | リクエストの流れ、ディレクトリ、レイヤ分け |
| [passkey.md](./passkey.md) | WebAuthn 登録・認証フローとライブラリ選定 |
| [session.md](./session.md) | Cookie + D1 セッション、長期ログイン方針 |
| [database.md](./database.md) | テーブルと責務 |
| [phase0.md](./phase0.md) | Phase 0 の範囲・完了条件 |
| [phase1.md](./phase1.md) | Phase 1（武将・マップ・旗揚げ） |

## 読む順番（おすすめ）

1. [phase0.md](./phase0.md) / [phase1.md](./phase1.md) — フェーズ範囲
2. [architecture.md](./architecture.md) — 全体の置き場所
3. [passkey.md](./passkey.md) / [session.md](./session.md) — 認証の核
4. [database.md](./database.md) — 永続化
5. [development.md](./development.md) — 手を動かすとき
