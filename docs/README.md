# docs

戦国日本史.net の設計・運用メモ。

コードを読む前の地図として使う。実装の「なぜ」はここ、細部はソースとコメントを優先する。

## いま使うもの

| ファイル | 内容 |
|----------|------|
| [roadmap.md](./roadmap.md) | **全体計画**（NETルール + 令制国、N1〜N6 完了） |
| [issue/](./issue/) | **Issue ごとの対応方針**（設計判断。実装チェックは別） |
| [impl.md](./impl.md) | **実装バックログ**（Slice・チェックリスト） |
| [net-spec.md](./net-spec.md) | 三国志.NET 式の要約 |
| [development.md](./development.md) | ローカル起動、環境変数、デプロイ、トラブルシュート |
| [architecture.md](./architecture.md) | リクエストの流れ、ディレクトリ、レイヤ分け |
| [passkey.md](./passkey.md) | WebAuthn 登録・認証フローとライブラリ選定 |
| [session.md](./session.md) | Cookie + D1 セッション、長期ログイン方針 |
| [database.md](./database.md) | テーブルと責務 |

## 過去（完了フェーズ）

MVP までの phase 記録は [`past/`](./past/)。経緯の参照用。仕様の正は上表とソース。

## 読む順番（おすすめ）

1. [roadmap.md](./roadmap.md) — 方針とフェーズ（MVP 完了）
2. [impl.md](./impl.md) / [issue/](./issue/) — これからやるもの
3. [net-spec.md](./net-spec.md) — 式・ルール要約
4. [architecture.md](./architecture.md) — 全体の置き場所
5. [passkey.md](./passkey.md) / [session.md](./session.md) — 認証の核
6. [database.md](./database.md) — 永続化
7. [development.md](./development.md) — 手を動かすとき
8. [past/](./past/) — 必要なら完了フェーズの経緯
