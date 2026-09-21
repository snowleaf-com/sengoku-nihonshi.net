# Passkey / WebAuthn

パスワードをサーバーに持たない。公開鍵暗号で「この端末（または同期されたパスキー）の持ち主」であることを証明する。

ライブラリ: `@simplewebauthn/server` + `@simplewebauthn/browser`（Workers の WebCrypto で動作）。

## 登場人物

| 名前 | 役割 |
|------|------|
| Relying Party (RP) | このサイト（Workers 上の Hono） |
| Authenticator | Face ID / Touch ID / 端末 PIN / セキュリティキー等 |
| Browser | `navigator.credentials` の窓口 |
| D1 | 公開鍵・credential id・counter・challenge の保存先 |

秘密鍵は **端末（またはパスキー同期先）だけ**。サーバーは公開鍵のみ。

## 登録（パスキーで始める）

```text
1. POST /auth/register/options
   → generateRegistrationOptions()
   → challenge を D1(webauthn_challenges) に短命保存
   → この時点で仮 user_id / webauthn_user_id を challenge に紐付け

2. ブラウザ: startRegistration()
   → navigator.credentials.create()
   → Authenticator が鍵ペア生成

3. POST /auth/register/verify
   → verifyRegistrationResponse()
     （challenge / origin / rpID を検証）
   → users + passkeys を INSERT
   → sessions 発行 → Cookie `sid`
   → /game へ
```

実装: `src/auth/passkey/index.ts` / `src/client/passkey.ts` / `src/routes/auth/index.ts`

## ログイン

```text
1. POST /auth/login/options
   → generateAuthenticationOptions()
   → usernameless（discoverable credential）
   → challenge 保存

2. ブラウザ: startAuthentication()
   → navigator.credentials.get()
   → Authenticator が署名

3. POST /auth/login/verify
   → credential id で passkeys を検索
   → verifyAuthenticationResponse()（公開鍵で署名検証）
   → counter 更新（クローン検知用）
   → 同一 user で session 発行
```

## なぜ毎回 WebAuthn しないのか

WebAuthn は「本人確認の儀式」コストが高い。  
成功後は **session Cookie** で通常リクエストを識別する（[session.md](./session.md)）。

## 設定の対応関係

| 環境 | RP ID | Origin |
|------|-------|--------|
| local | `localhost` | `http://localhost:5173` |
| staging | `sengoku-nihonshi-net-staging.….workers.dev` | `https://同ホスト` |
| production | `sengoku.snow-leaf.com` | `https://sengoku.snow-leaf.com` |

ズレると verify が必ず失敗する。独自ドメインを張ったら vars を合わせて再デプロイする。

## 複数 Passkey / 復旧

- DB は **1 user : N passkeys** を許容（`passkeys.user_id`）
- Phase 0 では追加登録 UI・失効リカバリ UI は未実装
- 将来: 追加 Passkey、外部 IdP、recovery を同テーブル上に足せる

## 自前実装しなかった理由

CBOR・attestation・counter・origin 検証を自前で持つと事故りやすい。  
SimpleWebAuthn は FIDO 準拠テストを通しており、Workers でも Node `crypto` に依存しない。
