/**
 * ルート結合: セッション付きでターン進行できることだけ見る。
 */
import { env, exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { SESSION_COOKIE_NAME } from '../src/config/auth'
import { createId, nowSeconds } from '../src/lib/id'
import { SessionRepository } from '../src/repositories/sessions'
import { UserRepository } from '../src/repositories/users'
import { createCharacter } from '../src/services/character'
import { raiseHouse } from '../src/services/house'
import { ensureGameState } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'
import { ProvinceRepository } from '../src/repositories/provinces'
import { GameStateRepository } from '../src/repositories/game-state'
import { PROVINCES } from '../src/config/provinces'

async function sessionCookieForNewLord(): Promise<{ cookie: string; beforeMonth: number }> {
  await ensureProvincesSeeded(env.DB)
  await ensureGameState(env.DB)

  const provinces = new ProvinceRepository(env.DB)
  let provinceId = ''
  for (const master of PROVINCES) {
    const row = await provinces.findById(master.id)
    if (row && !row.houseId) {
      provinceId = master.id
      break
    }
  }
  if (!provinceId) throw new Error('no neutral province')

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

  await createCharacter(env.DB, {
    userId,
    name: `進${createId(4)}`,
    iconId: 'busho_02',
    archetypeId: 'domestic',
    provinceId,
  })
  await raiseHouse(env.DB, { userId, houseName: `進家${createId(2)}` })

  const state = await new GameStateRepository(env.DB).get()
  return {
    cookie: `${SESSION_COOKIE_NAME}=${sessionId}`,
    beforeMonth: state.month,
  }
}

describe('http: advance-turn', () => {
  it('POST /actions/advance-turn advances the calendar when logged in', async () => {
    const { cookie, beforeMonth } = await sessionCookieForNewLord()

    const res = await exports.default.fetch('http://localhost/actions/advance-turn', {
      method: 'POST',
      headers: { Cookie: cookie },
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/game')

    const state = await new GameStateRepository(env.DB).get()
    const expectedMonth = beforeMonth === 12 ? 1 : beforeMonth + 1
    expect(state.month).toBe(expectedMonth)
  })
})
