import type { AppBindings } from '../types'

/** セッション Cookie 名。アカウント切替は提供しないので常に1本。 */
export const SESSION_COOKIE_NAME = 'sid'

/** WebAuthn challenge の有効期限（秒） */
export const CHALLENGE_TTL_SECONDS = 60 * 5

/** 既定の長期セッション TTL: 180日 */
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 180

export function getSessionTtlSeconds(env: AppBindings): number {
  const parsed = Number(env.SESSION_TTL_SECONDS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_TTL_SECONDS
}

export function getWebAuthnConfig(env: AppBindings) {
  return {
    rpName: env.WEBAUTHN_RP_NAME || '戦国日本史.net',
    rpID: env.WEBAUTHN_RP_ID,
    origin: env.WEBAUTHN_ORIGIN,
  }
}
