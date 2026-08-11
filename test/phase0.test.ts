import { env, exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { SESSION_COOKIE_NAME } from '../src/config/auth'
import { CHARACTER_ICON_IDS } from '../src/config/icons'
import { normalizeCharacterName } from '../src/lib/character-name'
import { createId, nowSeconds } from '../src/lib/id'
import { ChallengeRepository } from '../src/repositories/challenges'
import { CharacterRepository } from '../src/repositories/characters'
import { PasskeyRepository } from '../src/repositories/passkeys'
import { SessionRepository } from '../src/repositories/sessions'
import { UserRepository } from '../src/repositories/users'

describe('Phase 0 repositories', () => {
  it('creates and finds a user', async () => {
    const users = new UserRepository(env.DB)
    const id = createId()
    const now = nowSeconds()

    const created = await users.create(id, now)
    const found = await users.findById(id)

    expect(created.id).toBe(id)
    expect(found?.id).toBe(id)
  })

  it('stores a passkey blob and reads it back', async () => {
    const users = new UserRepository(env.DB)
    const passkeys = new PasskeyRepository(env.DB)
    const userId = createId()
    const now = nowSeconds()
    await users.create(userId, now)

    const publicKey = new Uint8Array([1, 2, 3, 4, 5])
    const created = await passkeys.create({
      id: `credential-${createId(8)}`,
      userId,
      webauthnUserId: createId(),
      publicKey,
      counter: 0,
      deviceType: 'multiDevice',
      backedUp: true,
      transports: ['internal'],
      createdAt: now,
    })

    const found = await passkeys.findByCredentialId(created.id)
    expect(found?.userId).toBe(userId)
    expect(found?.backedUp).toBe(true)
    expect([...found!.publicKey]).toEqual([...publicKey])
  })

  it('creates and deletes sessions', async () => {
    const users = new UserRepository(env.DB)
    const sessions = new SessionRepository(env.DB)
    const userId = createId()
    const now = nowSeconds()
    await users.create(userId, now)

    const session = await sessions.create({
      id: createId(32),
      userId,
      expiresAt: now + 3600,
      createdAt: now,
    })

    expect((await sessions.findById(session.id))?.userId).toBe(userId)
    await sessions.delete(session.id)
    expect(await sessions.findById(session.id)).toBeNull()
  })

  it('stores webauthn challenges', async () => {
    const challenges = new ChallengeRepository(env.DB)
    const now = nowSeconds()
    const created = await challenges.create({
      id: createId(),
      challenge: 'challenge-value',
      type: 'registration',
      userId: createId(),
      webauthnUserId: createId(),
      expiresAt: now + 300,
      createdAt: now,
    })

    const found = await challenges.findById(created.id)
    expect(found?.challenge).toBe('challenge-value')
    await challenges.delete(created.id)
    expect(await challenges.findById(created.id)).toBeNull()
  })
})

describe('Character repository', () => {
  it('creates one character per user', async () => {
    const users = new UserRepository(env.DB)
    const characters = new CharacterRepository(env.DB)
    const userId = createId()
    const now = nowSeconds()
    await users.create(userId, now)

    const created = await characters.create({
      id: createId(),
      userId,
      name: '武田晴信',
      iconId: CHARACTER_ICON_IDS[0],
      createdAt: now,
    })

    const found = await characters.findByUserId(userId)
    expect(found?.id).toBe(created.id)
    expect(found?.name).toBe('武田晴信')
    expect(found?.iconId).toBe(CHARACTER_ICON_IDS[0])
  })
})

describe('character name', () => {
  it('normalizes and rejects invalid names', () => {
    expect(normalizeCharacterName('  豊臣秀吉  ')).toBe('豊臣秀吉')
    expect(normalizeCharacterName('')).toBeNull()
    expect(normalizeCharacterName('   ')).toBeNull()
    expect(normalizeCharacterName('あ'.repeat(17))).toBeNull()
  })
})

describe('HTTP routes', () => {
  it('serves the top page', async () => {
    const res = await exports.default.fetch('http://localhost/')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('パスキーで始める')
    expect(html).toContain('天下統一を目指せ。')
  })

  it('protects /game without a session', async () => {
    const res = await exports.default.fetch('http://localhost/game', {
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/')
  })

  it('returns registration options JSON', async () => {
    const res = await exports.default.fetch('http://localhost/auth/register/options', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { challengeId: string; options: { challenge: string } }
    expect(body.challengeId).toBeTruthy()
    expect(body.options.challenge).toBeTruthy()
  })

  it('returns login options JSON', async () => {
    const res = await exports.default.fetch('http://localhost/auth/login/options', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { challengeId: string; options: { challenge: string } }
    expect(body.challengeId).toBeTruthy()
    expect(body.options.challenge).toBeTruthy()
  })

  it('shows character creation form when authenticated without a character', async () => {
    const cookie = await createSessionCookie()
    const res = await exports.default.fetch('http://localhost/game', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('武将を立てる')
    expect(html).toContain('/icons/busho_01.webp')
    expect(html).toContain('/icons/busho_36.webp')
    expect(html).toContain('name="iconId"')
  })

  it('creates a character and then shows the hub', async () => {
    const cookie = await createSessionCookie()
    const createRes = await exports.default.fetch('http://localhost/game/character', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        name: '明智光秀',
        iconId: 'busho_20',
      }),
      redirect: 'manual',
    })
    expect(createRes.status).toBe(302)
    expect(createRes.headers.get('Location')).toBe('/game')

    const gameRes = await exports.default.fetch('http://localhost/game', {
      headers: { Cookie: cookie },
    })
    expect(gameRes.status).toBe(200)
    const html = await gameRes.text()
    expect(html).toContain('明智光秀')
    expect(html).toContain('/icons/busho_20.webp')
    expect(html).toContain('出陣準備')
  })

  it('rejects invalid icon ids', async () => {
    const cookie = await createSessionCookie()
    const res = await exports.default.fetch('http://localhost/game/character', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        name: '検証武将',
        iconId: 'busho_99',
      }),
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/game?error=invalid_icon')
  })
})

async function createSessionCookie(): Promise<string> {
  const users = new UserRepository(env.DB)
  const sessions = new SessionRepository(env.DB)
  const userId = createId()
  const sessionId = createId(32)
  const now = nowSeconds()
  await users.create(userId, now)
  await sessions.create({
    id: sessionId,
    userId,
    expiresAt: now + 3600,
    createdAt: now,
  })
  return `${SESSION_COOKIE_NAME}=${sessionId}`
}
