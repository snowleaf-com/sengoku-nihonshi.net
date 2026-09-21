import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import {
  applyCommandsToPositions,
  executeCharacterCommand,
} from '../src/services/commands'
import { createCharacter } from '../src/services/character'
import {
  applyDisasterToProvince,
  pickDisasterType,
  shouldTriggerDisaster,
} from '../src/services/disaster'
import { raiseHouse } from '../src/services/house'
import { IDLE_DELETE_THRESHOLD, nextIdleStreakAfterNashi, shouldDeleteForIdle } from '../src/services/idle'
import { recruitOfficerSucceeds } from '../src/services/recruit-officer'
import { advanceDueTurns, ensureGameState } from '../src/services/turns'
import { createUnit, joinUnit } from '../src/services/units'
import { ensureProvincesSeeded } from '../src/services/world'
import { CharacterCommandRepository } from '../src/repositories/character-commands'
import { CharacterRepository } from '../src/repositories/characters'
import { ProvinceRepository } from '../src/repositories/provinces'
import { PROVINCES } from '../src/config/provinces'
import { listAdjacentIds } from '../src/domain/province/adjacency'
import { getProvinceMaster } from '../src/config/provinces'
import { createId, nowSeconds } from '../src/lib/id'
import { TRAIN_STAT_CONTRIBUTION, TRAIN_STAT_GOLD_COST } from '../src/config/net'

async function findNeutralProvince(prefer?: string[]): Promise<string> {
  await ensureProvincesSeeded(env.DB)
  await ensureGameState(env.DB)
  const provinces = new ProvinceRepository(env.DB)
  const candidates = prefer ?? PROVINCES.map((p) => p.id)
  for (const id of candidates) {
    const p = await provinces.findById(id)
    if (p && !p.houseId) return id
  }
  throw new Error('neutral province not found')
}

async function seedAt(provinceId: string, houseName?: string) {
  await ensureProvincesSeeded(env.DB)
  await ensureGameState(env.DB)
  const userId = createId(12)
  await env.DB.prepare(
    `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
  )
    .bind(userId, nowSeconds(), nowSeconds())
    .run()

  const character = await createCharacter(env.DB, {
    userId,
    name: `仕${createId(4)}`,
    iconId: 'busho_01',
    archetypeId: 'domestic',
    provinceId,
    buyu: '50',
    chiryaku: '50',
    toso: '50',
  })
  await raiseHouse(env.DB, { userId, houseName: houseName ?? `家${createId(3)}` })
  const owned = await new CharacterRepository(env.DB).findById(character.id)
  return { userId, character: owned! }
}

async function seedRonin(provinceId: string) {
  await ensureProvincesSeeded(env.DB)
  await ensureGameState(env.DB)
  const userId = createId(12)
  await env.DB.prepare(
    `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
  )
    .bind(userId, nowSeconds(), nowSeconds())
    .run()

  const character = await createCharacter(env.DB, {
    userId,
    name: `浪${createId(4)}`,
    iconId: 'busho_02',
    archetypeId: 'battle',
    provinceId,
    buyu: '50',
    chiryaku: '50',
    toso: '50',
  })
  return { userId, character }
}

describe('phase N6 helpers', () => {
  it('disaster helpers are pure and typed', () => {
    expect(shouldTriggerDisaster(0)).toBe(true)
    expect(shouldTriggerDisaster(0.5)).toBe(false)
    expect(pickDisasterType(0)).toBe('locust')

    const base = {
      agriculture: 1000,
      agricultureMax: 5000,
      commerce: 1000,
      commerceMax: 5000,
      defense: 1000,
      defenseMax: 5000,
      population: 10000,
      populationMax: 30000,
    }
    expect(applyDisasterToProvince(base, 'locust').agriculture).toBe(800)
    expect(applyDisasterToProvince(base, 'plague').population).toBe(8000)
    expect(applyDisasterToProvince(base, 'bumper').agriculture).toBe(1200)
  })

  it('idle threshold helpers', () => {
    expect(nextIdleStreakAfterNashi(59)).toBe(60)
    expect(shouldDeleteForIdle(59)).toBe(false)
    expect(shouldDeleteForIdle(60)).toBe(true)
    expect(IDLE_DELETE_THRESHOLD).toBe(60)
  })

  it('recruitOfficerSucceeds respects merit/loyalty/rng', () => {
    expect(recruitOfficerSucceeds({ merit: 10, loyalty: 100, random01: 0.99 })).toBe(true)
    expect(recruitOfficerSucceeds({ merit: 100, loyalty: 10, random01: 0.99 })).toBe(true)
    expect(recruitOfficerSucceeds({ merit: 100, loyalty: 100, random01: 0.1 })).toBe(true)
    expect(recruitOfficerSucceeds({ merit: 100, loyalty: 100, random01: 0.9 })).toBe(false)
  })
})

describe('phase N6 commands', () => {
  it('tanren spends gold and gains EX+2', async () => {
    const provinceId = await findNeutralProvince()
    const { userId, character } = await seedAt(provinceId)
    const beforeEx = character.buyuEx
    const beforeMoney = character.money
    const beforeMerit = character.merit

    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'tanren',
      positions: [0],
      payload: { kind: 'train_stat', stat: 'buyu' },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const result = await executeCharacterCommand(env.DB, character, queued)
    expect(result.ok).toBe(true)

    const updated = await new CharacterRepository(env.DB).findById(character.id)
    expect(updated!.money).toBe(beforeMoney - TRAIN_STAT_GOLD_COST)
    expect(updated!.merit).toBe(beforeMerit + TRAIN_STAT_CONTRIBUTION)
    expect(updated!.buyuEx).toBe(beforeEx + 2)
  })

  it('touyou succeeds when target merit is low', async () => {
    const provinceId = await findNeutralProvince()
    const lord = await seedAt(provinceId)
    const ronin = await seedRonin(provinceId)
    await env.DB.prepare(`UPDATE characters SET merit = 10, money = 500 WHERE id = ?`)
      .bind(ronin.character.id)
      .run()
    await env.DB.prepare(`UPDATE characters SET money = 500 WHERE id = ?`)
      .bind(lord.character.id)
      .run()

    const attacker = (await new CharacterRepository(env.DB).findById(lord.character.id))!

    await applyCommandsToPositions(env.DB, {
      userId: lord.userId,
      commandId: 'touyou',
      positions: [0],
      payload: { kind: 'recruit_officer', targetCharacterId: ronin.character.id },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(attacker.id))[0]!
    const result = await executeCharacterCommand(env.DB, attacker, queued)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.message).toContain('登用した')

    const target = await new CharacterRepository(env.DB).findById(ronin.character.id)
    expect(target!.houseId).toBe(attacker.houseId)
    expect(target!.defending).toBe(0)
  })

  it('syuugou gathers unit members to leader province', async () => {
    const from = await findNeutralProvince(['musashi', 'sagami', 'kai', 'izu'])
    const master = getProvinceMaster(from)!
    const adj = listAdjacentIds(master, PROVINCES)
    let to = ''
    for (const id of adj) {
      const p = await new ProvinceRepository(env.DB).findById(id)
      if (p && !p.houseId) {
        to = id
        break
      }
    }
    if (!to) {
      // fallback: just use adjacent even if owned after seeding house
      to = adj[0]!
    }

    const leader = await seedAt(from)
    const memberUser = createId(12)
    await env.DB.prepare(
      `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
    )
      .bind(memberUser, nowSeconds(), nowSeconds())
      .run()
    const member = await createCharacter(env.DB, {
      userId: memberUser,
      name: `隊${createId(4)}`,
      iconId: 'busho_03',
      archetypeId: 'battle',
      provinceId: from,
      buyu: '50',
      chiryaku: '50',
      toso: '50',
    })
    await new CharacterRepository(env.DB).assignHouse(
      member.id,
      leader.character.houseId!,
      nowSeconds(),
    )

    const unit = await createUnit(env.DB, { userId: leader.userId, name: `鉄${createId(2)}` })
    await joinUnit(env.DB, { userId: memberUser, unitId: unit.id })
    await new CharacterRepository(env.DB).updateProvince(member.id, to, nowSeconds())

    await applyCommandsToPositions(env.DB, {
      userId: leader.userId,
      commandId: 'syuugou',
      positions: [0],
    })
    const leaderFresh = (await new CharacterRepository(env.DB).findById(leader.character.id))!
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(leaderFresh.id))[0]!
    const result = await executeCharacterCommand(env.DB, leaderFresh, queued)
    expect(result.ok).toBe(true)

    const gathered = await new CharacterRepository(env.DB).findById(member.id)
    expect(gathered!.provinceId).toBe(leaderFresh.provinceId)
  })

  it('nashi at idle_streak 59 deletes character', async () => {
    const provinceId = await findNeutralProvince()
    const { userId, character } = await seedAt(provinceId)
    await env.DB.prepare(`UPDATE characters SET idle_streak = 59 WHERE id = ?`)
      .bind(character.id)
      .run()

    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'nashi',
      positions: [0],
    })
    await advanceDueTurns(env.DB, { force: true })

    const gone = await new CharacterRepository(env.DB).findById(character.id)
    expect(gone).toBeNull()
  })
})
