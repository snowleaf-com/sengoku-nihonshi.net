# データベース（Phase 0）

Cloudflare D1（SQLite）。migration は `migrations/`。

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

## ER 概略

```text
users 1───* passkeys
  │
  └───* sessions

webauthn_challenges   （短命・user に依存しない行もあり）
```

User と Character（武将）は **別 entity**。Phase 0 では Character テーブル未作成。

## テーブル

### users

認証主体。メールもパスワードも持たない。

| 列 | 意味 |
|----|------|
| id | 主キー（登録時に発行した仮 id を確定） |
| created_at / updated_at | unix 秒 |
| last_login_at | 最終ログイン |

### passkeys

WebAuthn 資格情報。秘密鍵は保存しない。

| 列 | 意味 |
|----|------|
| id | credential id（base64url） |
| user_id | 所有者 |
| webauthn_user_id | userHandle |
| public_key | BLOB |
| counter | 認証カウンタ |
| device_type / backed_up / transports | Authenticator メタデータ |
| created_at / last_used_at | |

1 user に複数行を許容（追加 Passkey 用）。

### sessions

長期ログイン。

| 列 | 意味 |
|----|------|
| id | Cookie に載せる opaque id |
| user_id | |
| expires_at | |
| created_at | |

### webauthn_challenges

登録・認証の challenge 一時保存。

| 列 | 意味 |
|----|------|
| type | `registration` / `authentication` |
| challenge | |
| user_id / webauthn_user_id | 登録時の仮紐付け |
| expires_at | 短命 |

verify 成功後に削除。期限切れ行は読み時に無効扱い（掃除は将来 Cron でも可）。

## Repository

SQL は `src/repositories/*` に閉じる。ルートや Passkey モジュールから D1 の生クエリを散らかさない。

## Phase 1 以降で増える想定

`characters` / `houses` / `provinces` / `commands` / `turns` / `battle_logs` など。  
仕様書の DB 案を、そのフェーズの migration で足す。
