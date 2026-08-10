-- Phase 0: Passkey 認証と長期セッションの基盤
-- User と Character は分離する（Character は Phase 1）

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE passkeys (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  webauthn_user_id TEXT NOT NULL,
  public_key BLOB NOT NULL,
  counter INTEGER NOT NULL,
  device_type TEXT NOT NULL,
  backed_up INTEGER NOT NULL,
  transports TEXT,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE INDEX passkeys_user_id_idx ON passkeys(user_id);
CREATE INDEX passkeys_webauthn_user_id_idx ON passkeys(webauthn_user_id);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

-- WebAuthn challenge は短命。verify 後に削除する。
CREATE TABLE webauthn_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  user_id TEXT,
  webauthn_user_id TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX webauthn_challenges_expires_at_idx ON webauthn_challenges(expires_at);
