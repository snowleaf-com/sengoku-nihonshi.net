import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { getSessionTtlSeconds, SESSION_COOKIE_NAME } from '../../config/auth'
import { createId, nowSeconds } from '../../lib/id'
import { SessionRepository } from '../../repositories/sessions'
import { UserRepository } from '../../repositories/users'
import type { AppEnv, Session, User } from '../../types'

/**
 * Passkey 検証成功後に長期セッションを発行する。
 *
 * フロー:
 *   WebAuthn verify OK → sessions INSERT → HttpOnly Cookie に session id のみ保存
 *
 * Cookie には user_id や秘密を入れない。失効・ログアウトは D1 の行削除で行う。
 */
export async function createSession(
  c: Context<AppEnv>,
  userId: string,
): Promise<{ session: Session; user: User }> {
  const now = nowSeconds()
  const ttl = getSessionTtlSeconds(c.env)
  const sessions = new SessionRepository(c.env.DB)
  const users = new UserRepository(c.env.DB)

  const session = await sessions.create({
    id: createId(32),
    userId,
    expiresAt: now + ttl,
    createdAt: now,
  })

  await users.touchLogin(userId, now)
  const user = await users.findById(userId)
  if (!user) {
    throw new Error('User missing after session create')
  }

  setSessionCookie(c, session.id, ttl)
  return { session, user }
}

export async function destroySession(c: Context<AppEnv>): Promise<void> {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME)
  if (sessionId) {
    await new SessionRepository(c.env.DB).delete(sessionId)
  }
  clearSessionCookie(c)
}

export async function loadSession(
  c: Context<AppEnv>,
): Promise<{ user: User; session: Session } | null> {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME)
  if (!sessionId) return null

  const now = nowSeconds()
  const sessions = new SessionRepository(c.env.DB)
  const session = await sessions.findById(sessionId)

  if (!session || session.expiresAt < now) {
    if (session) {
      await sessions.delete(session.id)
    }
    clearSessionCookie(c)
    return null
  }

  const users = new UserRepository(c.env.DB)
  const user = await users.findById(session.userId)
  if (!user) {
    await sessions.delete(session.id)
    clearSessionCookie(c)
    return null
  }

  // 長期セッション: アクセスのたびに TTL を延長（アカウント切替なし前提）
  const ttl = getSessionTtlSeconds(c.env)
  const newExpiresAt = now + ttl
  if (newExpiresAt - session.expiresAt > 60 * 60 * 24) {
    await sessions.extend(session.id, newExpiresAt)
    setSessionCookie(c, session.id, ttl)
    session.expiresAt = newExpiresAt
  }

  return { user, session }
}

function setSessionCookie(c: Context<AppEnv>, sessionId: string, maxAge: number) {
  const isLocal = isLocalOrigin(c.env.WEBAUTHN_ORIGIN)

  setCookie(c, SESSION_COOKIE_NAME, sessionId, {
    path: '/',
    httpOnly: true,
    secure: !isLocal,
    sameSite: 'Lax',
    maxAge,
  })
}

function clearSessionCookie(c: Context<AppEnv>) {
  const isLocal = isLocalOrigin(c.env.WEBAUTHN_ORIGIN)
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    secure: !isLocal,
  })
}

function isLocalOrigin(origin: string | undefined): boolean {
  if (!origin) return true
  return origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')
}
