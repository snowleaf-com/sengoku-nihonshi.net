# 開発を再開するとき

- まず `docs/resume.md` を読み、`docs/impl.md` と対象の `docs/issue/{番号}.md` を確認する。
- 再開メモの日時以降に進捗がある場合は、最新の GitHub Issue・コメント・PR とコードを照合する。
- 実装済み、マージ済み、実機確認済み、本番適用済みを区別する。未確認を完了扱いにしない。
- 設計判断・未決事項は `docs/issue/`、実装の進捗は `docs/impl.md` に残す。再開の入口・依存関係が変わったら `docs/resume.md` も更新する。
- 開発・検証・migration・deploy の手順は `docs/development.md`、文書の一覧は `docs/README.md` を参照する。
