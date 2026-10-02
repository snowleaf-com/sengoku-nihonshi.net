import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { CLASS_PER_RANK, TRAIN_STAT_GOLD_COST } from '../src/config/net'
import { applyCommandsToPositions } from '../src/services/commands'
import { createCharacter } from '../src/services/character'
import { raiseHouse } from '../src/services/house'
import { advanceDueTurns, ensureGameState } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'
import { CharacterRepository } from '../src/repositories/characters'
import { GameStateRepository } from '../src/repositories/game-state'
import { HouseRoleRepository } from '../src/repositories/house-roles'
import { createId, nowSeconds } from '../src/lib/id'
import { HOUSE_ROLES } from '../src/config/game'
import { PROVINCES } from '../src/config/provinces'
import { ProvinceRepository } from '../src/repositories/provinces'

async function neutralProvinceId(): Promise<string> {
  await ensureProvincesSeeded(env.DB)
  const provinces = new ProvinceRepository(env.DB)
  for (const p of PROVINCES) {
    const row = await provinces.findById(p.id)
    if (row && !row.houseId) return p.id
  }
  throw new Error('neutral province not found')
}

async function seedMemberHouse() {
  await ensureProvincesSeeded(env.DB)
  await ensureGameState(env.DB)
  const provinceId = await neutralProvinceId()
  const userId = createId(12)
  await env.DB.prepare(
    `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
  )
    .bind(userId, nowSeconds(), nowSeconds())
    .run()
  await createCharacter(env.DB, {
    userId,
    name: `家${createId(4)}`,
    iconId: 'busho_01',
    archetypeId: 'domestic',
    provinceId,
  })
  await raiseHouse(env.DB, { userId, houseName: `テ${createId(3)}` })
  const lord = await new CharacterRepository(env.DB).findByUserId(userId)
  expect(lord?.houseId).toBeTruthy()

  const retainerUser = createId(12)
  await env.DB.prepare(
    `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
  )
    .bind(retainerUser, nowSeconds(), nowSeconds())
    .run()
  const retainer = await createCharacter(env.DB, {
    userId: retainerUser,
    name: `臣${createId(4)}`,
    iconId: 'busho_02',
    archetypeId: 'domestic',
    provinceId,
  })
  await new CharacterRepository(env.DB).assignHouse(retainer.id, lord!.houseId, nowSeconds())
  await new HouseRoleRepository(env.DB).create({
    id: createId(16),
    houseId: lord!.houseId!,
    characterId: retainer.id,
    role: HOUSE_ROLES.retainer,
    createdAt: nowSeconds(),
  })
  return { lord: lord!, retainer, retainerUser }
}

describe('Slice B/C: pay merit and gezan', () => {
  it('tanren merit does not count toward pay_merit', async () => {
    const { lord } = await seedMemberHouse()
    await new CharacterRepository(env.DB).updateResources(lord.id, {
      money: TRAIN_STAT_GOLD_COST + 100,
      updatedAt: nowSeconds(),
    })
    await applyCommandsToPositions(env.DB, {
      userId: lord.userId,
      commandId: 'tanren',
      positions: [0],
      payload: { kind: 'train_stat', stat: 'buyu' },
    })
    await advanceDueTurns(env.DB, { force: true })
    const after = await new CharacterRepository(env.DB).findById(lord.id)
    expect(after!.merit).toBeGreaterThan(0)
    expect(after!.payMerit).toBe(0)
  })

  it('gezan removes house membership for non-lord', async () => {
    const { retainer, retainerUser } = await seedMemberHouse()
    await applyCommandsToPositions(env.DB, {
      userId: retainerUser,
      commandId: 'gezan',
      positions: [0],
    })
    await advanceDueTurns(env.DB, { force: true })
    const after = await new CharacterRepository(env.DB).findById(retainer.id)
    expect(after!.houseId).toBeNull()
    expect(await new HouseRoleRepository(env.DB).findByCharacterId(retainer.id)).toBeNull()
  })

  it('promotion message on tax month when class crosses threshold', async () => {
    const { lord } = await seedMemberHouse()
    const repo = new GameStateRepository(env.DB)
    await repo.save({
      date: { year: 1, month: 12 },
      turnIndex: 100,
      nextTurnAt: nowSeconds() - 1,
      updatedAt: nowSeconds(),
    })
    await new CharacterRepository(env.DB).updateResources(lord.id, {
      classPoints: CLASS_PER_RANK - 1,
      payMerit: 100,
      merit: 100,
      updatedAt: nowSeconds(),
    })
    await advanceDueTurns(env.DB, { force: true })
    const updated = await new CharacterRepository(env.DB).findById(lord.id)
    expect(updated!.rank).toBeGreaterThan(1)
    const events = await env.DB.prepare(
      `SELECT message FROM world_events WHERE character_id = ? ORDER BY created_at DESC LIMIT 5`,
    )
      .bind(lord.id)
      .all<{ message: string }>()
    const messages = (events.results ?? []).map((r) => r.message)
    expect(messages.some((m) => m.includes('階級が'))).toBe(true)
  })
})
