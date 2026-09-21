import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { calcAttackPower, resolveBattle, wallDefender } from '../src/services/battle'
import {
  applyCommandsToPositions,
  executeCharacterCommand,
} from '../src/services/commands'
import { createCharacter } from '../src/services/character'
import { raiseHouse } from '../src/services/house'
import { ensureGameState } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'
import { CharacterCommandRepository } from '../src/repositories/character-commands'
import { CharacterRepository } from '../src/repositories/characters'
import { HouseRepository } from '../src/repositories/houses'
import { ProvinceRepository } from '../src/repositories/provinces'
import { WorldEventRepository } from '../src/repositories/world-events'
import { getProvinceMaster, PROVINCES } from '../src/config/provinces'
import { listAdjacentIds } from '../src/domain/province/adjacency'
import { createId, nowSeconds } from '../src/lib/id'
import { BATTLE_STOP_MONTHS, WAR_CONTRIBUTION, isHouseWarReady } from '../src/config/net'

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

/** 中立の隣接ペア（攻撃元・攻撃先） */
async function findNeutralAdjacentPair(): Promise<{ from: string; to: string }> {
  await ensureProvincesSeeded(env.DB)
  await ensureGameState(env.DB)
  const provinces = new ProvinceRepository(env.DB)
  for (const master of PROVINCES) {
    const from = await provinces.findById(master.id)
    if (!from || from.houseId) continue
    for (const adjId of listAdjacentIds(master, PROVINCES)) {
      const to = await provinces.findById(adjId)
      if (to && !to.houseId) return { from: master.id, to: adjId }
    }
  }
  throw new Error('neutral adjacent pair not found')
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
    name: `戦${createId(4)}`,
    iconId: 'busho_01',
    archetypeId: 'battle',
    provinceId,
    buyu: '50',
    chiryaku: '50',
    toso: '50',
  })
  await raiseHouse(env.DB, { userId, houseName: houseName ?? `家${createId(3)}` })
  const owned = await new CharacterRepository(env.DB).findById(character.id)
  return { userId, character: owned! }
}

/** 建国直後でも戦争できるよう founded_turn を過去にする */
async function unlockWar(houseId: string) {
  const state = await ensureGameState(env.DB)
  await env.DB.prepare(`UPDATE houses SET founded_turn = ? WHERE id = ?`)
    .bind(state.turnIndex - BATTLE_STOP_MONTHS, houseId)
    .run()
}

describe('phase N4 battle math', () => {
  it('calcAttackPower matches NET formula', () => {
    // (80 + 0 - 0 - floor(60/2.5)) / 8 = (80 - 24) / 8 = 7
    expect(calcAttackPower(80, 60)).toBe(7)
    expect(calcAttackPower(30, 60)).toBe(0)
  })

  it('resolveBattle is deterministic with fixed rng', () => {
    let i = 0
    const sequence = [0.9, 0.1, 0.9, 0.1, 0.9]
    const rng = () => sequence[i++] ?? 0.5

    const result = resolveBattle(
      { troops: 10, buyu: 80, training: 50 },
      { troops: 5, buyu: 30, training: 60 },
      rng,
    )
    expect(result.winner).toBe('attacker')
    expect(result.defenderTroops).toBe(0)
    expect(result.attackerTroops).toBeGreaterThan(0)
  })

  it('wallDefender uses defense as troops', () => {
    expect(wallDefender(100)).toEqual({ troops: 100, buyu: 30, training: 60 })
  })

  it('isHouseWarReady uses 36 months', () => {
    expect(isHouseWarReady(36, 0)).toBe(true)
    expect(isHouseWarReady(35, 0)).toBe(false)
    expect(isHouseWarReady(100, 70)).toBe(false)
    expect(isHouseWarReady(106, 70)).toBe(true)
  })
})

describe('phase N4 war', () => {
  it('sets founded_turn on raiseHouse', async () => {
    const provinceId = await findNeutralProvince()
    const { character } = await seedAt(provinceId)
    const house = await new HouseRepository(env.DB).findById(character.houseId!)
    const state = await ensureGameState(env.DB)
    expect(house?.foundedTurn).toBe(state.turnIndex)
  })

  it('rejects war before battle stop months', async () => {
    const { from, to } = await findNeutralAdjacentPair()
    const { userId, character } = await seedAt(from)
    await new CharacterRepository(env.DB).updateResources(character.id, {
      troops: 50,
      updatedAt: nowSeconds(),
    })
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'sensou',
      positions: [0],
      payload: { kind: 'war', provinceId: to },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const current = await new CharacterRepository(env.DB).findById(character.id)
    const result = await executeCharacterCommand(env.DB, current!, queued)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('36')
  })

  it('occupies adjacent neutral by beating walls', async () => {
    const { from, to } = await findNeutralAdjacentPair()
    const { userId, character } = await seedAt(from)
    await unlockWar(character.houseId!)
    const characters = new CharacterRepository(env.DB)
    await characters.updateResources(character.id, {
      troops: 200,
      training: 80,
      buyu: 90,
      updatedAt: nowSeconds(),
    })
    const provinces = new ProvinceRepository(env.DB)
    await provinces.updateStats(to, { defense: 5, updatedAt: nowSeconds() })

    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'sensou',
      positions: [0],
      payload: { kind: 'war', provinceId: to },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const before = await characters.findById(character.id)
    const result = await executeCharacterCommand(env.DB, before!, queued)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.message).toContain('占領')

    const after = await characters.findById(character.id)
    const target = await provinces.findById(to)
    expect(target?.houseId).toBe(character.houseId)
    expect(target?.defense).toBe(0)
    expect(after?.merit).toBe((before?.merit ?? 0) + WAR_CONTRIBUTION)
    expect(after?.buyuEx).toBe(1)

    const news = await new WorldEventRepository(env.DB).listRecent({
      channel: 'news',
      limit: 10,
    })
    expect(news.some((e) => e.kind === 'war' && e.message.includes('攻略'))).toBe(true)
  })

  it('defeats defending character and occupies', async () => {
    const { from, to } = await findNeutralAdjacentPair()
    const attacker = await seedAt(from, `攻${createId(2)}`)
    await unlockWar(attacker.character.houseId!)

    const defender = await seedAt(to, `守${createId(2)}`)
    await unlockWar(defender.character.houseId!)

    const characters = new CharacterRepository(env.DB)
    await characters.updateResources(attacker.character.id, {
      troops: 200,
      training: 90,
      buyu: 95,
      updatedAt: nowSeconds(),
    })
    await characters.updateResources(defender.character.id, {
      troops: 3,
      training: 10,
      buyu: 20,
      defending: 1,
      updatedAt: nowSeconds(),
    })

    await applyCommandsToPositions(env.DB, {
      userId: attacker.userId,
      commandId: 'sensou',
      positions: [0],
      payload: { kind: 'war', provinceId: to },
    })
    const queued = (
      await new CharacterCommandRepository(env.DB).listByCharacter(attacker.character.id)
    )[0]!
    const before = await characters.findById(attacker.character.id)
    const result = await executeCharacterCommand(env.DB, before!, queued)
    expect(result.ok).toBe(true)

    const occupied = await new ProvinceRepository(env.DB).findById(to)
    expect(occupied?.houseId).toBe(attacker.character.houseId)
    const defAfter = await characters.findById(defender.character.id)
    expect(defAfter?.troops).toBe(0)
    expect(defAfter?.defending).toBe(0)
  })

  it('rejects attacking own province', async () => {
    const { from, to } = await findNeutralAdjacentPair()
    const { userId, character } = await seedAt(from)
    await unlockWar(character.houseId!)
    await new CharacterRepository(env.DB).updateResources(character.id, {
      troops: 50,
      updatedAt: nowSeconds(),
    })
    await new ProvinceRepository(env.DB).updateOwner(to, character.houseId!, nowSeconds())
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'sensou',
      positions: [0],
      payload: { kind: 'war', provinceId: to },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const current = await new CharacterRepository(env.DB).findById(character.id)
    const result = await executeCharacterCommand(env.DB, current!, queued)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('自国')
  })

  it('rejects non-adjacent target', async () => {
    const from = await findNeutralProvince()
    const { userId, character } = await seedAt(from)
    await unlockWar(character.houseId!)
    await new CharacterRepository(env.DB).updateResources(character.id, {
      troops: 50,
      updatedAt: nowSeconds(),
    })
    const master = getProvinceMaster(from)!
    const adjacent = new Set(listAdjacentIds(master, PROVINCES))
    const far = PROVINCES.find((p) => p.id !== from && !adjacent.has(p.id))
    expect(far).toBeTruthy()

    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'sensou',
      positions: [0],
      payload: { kind: 'war', provinceId: far!.id },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const current = await new CharacterRepository(env.DB).findById(character.id)
    const result = await executeCharacterCommand(env.DB, current!, queued)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('隣接')
  })
})
