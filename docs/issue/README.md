# docs/issue — Issue 対応方針

GitHub Issue ごとに **どう進めるか（方針・前提・判断）** を書く場所。

実装の進捗・チェックリストはここではなく **[`../impl.md`](../impl.md)** で管理する。

## ルール

| 置き場 | 書くこと | 書かないこと |
|--------|----------|--------------|
| `docs/issue/{番号}.md` | 背景、現状、方針、やり方の選択肢、未決事項 | タスク消化のチェックリスト、PR 番号の羅列 |
| [`../impl.md`](../impl.md) | Slice・優先順・完了チェック | 長い設計議論（方針側へ） |

## ファイル名

```text
docs/issue/{GitHubのIssue番号}.md
例: 28.md → https://github.com/snowleaf-com/sengoku-nihonshi.net/issues/28
```

Issue を切ったら、必要なら同番号の md を追加して方針を書く。  
採番前のメモは `_draft-名前.md` でもよいが、Issue 作成後に `{番号}.md` へ移す。

## テンプレ

```markdown
# Issue #{番号} — {タイトル}

- Issue: https://github.com/snowleaf-com/sengoku-nihonshi.net/issues/{番号}
- 実装: [`../impl.md`](../impl.md) の該当 Slice

## 背景

（Issue で言っていること・なぜ今やるか）

## 現状

（コード上すでにある／ない）

## 方針

（採用するやり方。捨てる案があれば一言）

## 未決

（決めてから実装するもの）
```

## 一覧

| Issue | ファイル | 内容 |
|-------|----------|------|
| [#28](https://github.com/snowleaf-com/sengoku-nihonshi.net/issues/28) | [28.md](./28.md) | 気づいたこと（UI・人事・盤面など） |
| [#30](https://github.com/snowleaf-com/sengoku-nihonshi.net/issues/30) | [30.md](./30.md) | Wrangler → `cf` CLI 移行 |
| [#33](https://github.com/snowleaf-com/sengoku-nihonshi.net/issues/33) | [33.md](./33.md) | 魔改造案（都市ランク・海路・国家方針など中長期） |
