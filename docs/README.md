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
| [phase1.md](./phase1.md) | Phase 1（武将・マップ・建国/仕官） |
| [phase1.5.md](./phase1.5.md) | Phase 1.5（立ち回り・能力） |
| [phase2.md](./phase2.md) | Phase 2（ターン基盤・暫定内政）※N1 で置換 |
| [phase-n1.md](./phase-n1.md) | Phase N1（NET内政・式合わせ） |
| [phase-n2.md](./phase-n2.md) | Phase N2（移動・仕官・米売買） |
| [phase-n3.md](./phase-n3.md) | Phase N3（徴兵・訓練・守備・兵糧） |
| [phase-n4.md](./phase-n4.md) | Phase N4（戦争・占領） |
| [net-spec.md](./net-spec.md) | 三国志.NET 式の要約 |
| [roadmap.md](./roadmap.md) | **全体計画**（NETルール + 令制国、N1〜N6） |

## 読む順番（おすすめ）

1. [roadmap.md](./roadmap.md) — 方針と今後のフェーズ
2. [net-spec.md](./net-spec.md) / [phase-n4.md](./phase-n4.md) — いま実装中
3. [phase0.md](./phase0.md) 〜 [phase-n3.md](./phase-n3.md) — 済んだ範囲
4. [architecture.md](./architecture.md) — 全体の置き場所
5. [passkey.md](./passkey.md) / [session.md](./session.md) — 認証の核
6. [database.md](./database.md) — 永続化
7. [development.md](./development.md) — 手を動かすとき
