# セッション

Passkey 成功後に発行する、長期ログイン状態。

## 方針

- **長期セッション**（既定 180 日、`SESSION_TTL_SECONDS`）
- **アカウント切替 UI なし**（Cookie は常に1本）
- Cookie に入れるのは **opaque な session id だけ**（user id や秘密を載せない）
- 失効・ログアウトは D1 の行削除で実現

これで「同じ端末で別アカウントを量産する」操作を面倒にし、重複登録を抑える。

## フロー

```text
Passkey verify OK
  → sessions INSERT (id, user_id, expires_at)
  → Set-Cookie: sid=<id>; HttpOnly; SameSite=Lax; Secure(本番)
  → users.last_login_at 更新

以降のリクエスト
  → Cookie sid を読む
  → D1 で sessions を照合（期限切れなら削除して未ログイン）
  → c.set('user' / 'session')

ログアウト
  → sessions DELETE
  → Cookie 削除
```

実装: `src/auth/session/index.ts` / `src/middleware/auth.ts`

## Cookie 属性

| 属性 | 値 | 理由 |
|------|-----|------|
| 名前 | `sid` | session id |
| HttpOnly | true | JS から読めない（XSS 耐性） |
| SameSite | Lax | 基本的な CSRF 緩和 |
| Secure | 本番 true / local false | localhost は HTTP |
| Max-Age | TTL 秒 | 長期維持 |

## Sliding expiration

アクセス時、期限までまだ余裕があっても **1日以上延びるなら** `expires_at` を更新し Cookie も張り直す。  
常時オンラインでなくても、たまに来るプレイヤーが突然切られにくくする。

## 採用しなかった案

| 案 | 見送り理由 |
|----|------------|
| JWT のみ（DB なし） | 即時無効化・強制ログアウトが弱い |
| KV session | Phase 0 では依存を増やしたくない。ゲーム本体も D1 |
| ID/PASS を Cookie に保存 | 旧三国志 NET の反面教師。絶対にやらない |

## WebAuthn challenge との違い

| | sessions | webauthn_challenges |
|--|----------|---------------------|
| 寿命 | 月〜半年 | 数分 |
| 目的 | ログイン状態 | 一度きりの儀式の紐付け |
| 成功後 | 残す（ログアウトまで） | 削除 |
