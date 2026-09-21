import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import {
  applyCommandsToPositions,
  executeCharacterCommand,
} from '../src/services/commands'
import { createCharacter } from '../src/services/character'
import { raiseHouse } from '../src/services/house'
import { applyTroopUpkeep, ensureGameState, advanceDueTurns } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'
import { CharacterCommandRepository } from '../src/repositories/character-commands'
import { CharacterRepository } from '../src/repositories/characters'
import { ProvinceRepository } from '../src/repositories/provinces'
import { createId, nowSeconds } from '../src/lib/id'
import {
  RECRUIT_CONTRIBUTION,
  RECRUIT_GOLD_PER,
  RECRUIT_POP_PER,
  DEFEND_CONTRIBUTION,
  TRAIN_CONTRIBUTION,
} from '../src/config/net'

async function seedHomeCharacter(opts?: { provinceId?: string }) {
  await ensureProvincesSeeded(env.DB)
  await ensureGameState(env.DB)
  const userId = createId(12)
  await env.DB.prepare(
    `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
  )
    .bind(userId, nowSeconds(), nowSeconds())
    .run()

  const provinces = new ProvinceRepository(env.DB)
  let chosen = opts?.provinceId ?? ''
  if (!chosen) {
    for (const id of [
      'tosa',
      'satsuma',
      'hyuga',
      'hizen',
      'nagato',
      'suo',
      'aki',
      'bingo',
      'bitchu',
      'bizen',
      'harima',
      'tajima',
      'tango',
      'wakasa',
      'echizen',
      'kaga',
      'noto',
      'etchu',
      'echigo',
      'sado',
      'mutsu',
      'dewa',
      'shimotsuke',
      'hitachi',
      'kazusa',
      'shimousa',
      'awa',
      'sagami',
      'kai',
      'shinano',
      'hida',
      'suruga',
      'totomi',
      'mikawa',
      'ise',
      'iga',
      'yamato',
      'kii',
      'izumi',
      'kawachi',
      'settsu',
      'tanba',
    ]) {
      const p = await provinces.findById(id)
      if (p && !p.houseId) {
        chosen = id
        break
      }
    }
  }
  if (!chosen) throw new Error('neutral province not found')

  const character = await createCharacter(env.DB, {
    userId,
    name: `軍${createId(4)}`,
    iconId: 'busho_01',
    archetypeId: 'battle',
    provinceId: chosen,
    buyu: '50',
    chiryaku: '50',
    toso: '50',
  })
  await raiseHouse(env.DB, { userId, houseName: `家${createId(3)}` })
  const owned = await new CharacterRepository(env.DB).findById(character.id)
  return { userId, character: owned! }
}

describe('phase N3 military', () => {
  it('recruits troops with gold population loyalty and lowers training', async () => {
    const { userId, character } = await seedHomeCharacter()
    const characters = new CharacterRepository(env.DB)
    await characters.updateResources(character.id, {
      money: 5000,
      training: 40,
      updatedAt: nowSeconds(),
    })
    const provinces = new ProvinceRepository(env.DB)
    const beforeProvince = await provinces.findById(character.provinceId)
    expect(beforeProvince).toBeTruthy()

    const amount = 20
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'chouhei',
      positions: [0],
      payload: { kind: 'recruit', amount },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    expect(queued.payload).toContain('"amount":20')

    const before = await characters.findById(character.id)
    const result = await executeCharacterCommand(env.DB, before!, queued)
    expect(result.ok).toBe(true)

    const after = await characters.findById(character.id)
    const afterProvince = await provinces.findById(character.provinceId)
    expect(after?.troops).toBe(amount)
    expect(after?.money).toBe((before?.money ?? 0) - amount * RECRUIT_GOLD_PER)
    expect(after?.training).toBe(20)
    expect(after?.merit).toBe((before?.merit ?? 0) + RECRUIT_CONTRIBUTION)
    expect(after?.buyuEx).toBe(1)
    expect(afterProvince?.population).toBe(
      (beforeProvince?.population ?? 0) - amount * RECRUIT_POP_PER,
    )
    expect(afterProvince?.loyalty).toBe((beforeProvince?.loyalty ?? 0) - Math.floor(amount / 10))
  })

  it('rejects recruit over toso cap', async () => {
    const { userId, character } = await seedHomeCharacter()
    await new CharacterRepository(env.DB).updateResources(character.id, {
      money: 99999,
      troops: character.toso,
      updatedAt: nowSeconds(),
    })
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'chouhei',
      positions: [0],
      payload: { kind: 'recruit', amount: 1 },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const current = await new CharacterRepository(env.DB).findById(character.id)
    const result = await executeCharacterCommand(env.DB, current!, queued)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('統率')
  })

  it('trains troops and gains toso EX', async () => {
    const { userId, character } = await seedHomeCharacter()
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'kunren',
      positions: [0],
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const before = await new CharacterRepository(env.DB).findById(character.id)
    const result = await executeCharacterCommand(env.DB, before!, queued)
    expect(result.ok).toBe(true)
    const after = await new CharacterRepository(env.DB).findById(character.id)
    expect(after?.training).toBeGreaterThan(before?.training ?? 0)
    expect(after?.training).toBeLessThanOrEqual(100)
    expect(after?.merit).toBe((before?.merit ?? 0) + TRAIN_CONTRIBUTION)
    expect(after?.tosoEx).toBe(1)
  })

  it('sets defending and clears other defenders in the province', async () => {
    const { userId, character } = await seedHomeCharacter()
    const characters = new CharacterRepository(env.DB)
    await characters.updateResources(character.id, {
      troops: 10,
      updatedAt: nowSeconds(),
    })

    const otherUser = createId(12)
    await env.DB.prepare(
      `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
    )
      .bind(otherUser, nowSeconds(), nowSeconds())
      .run()
    const other = await createCharacter(env.DB, {
      userId: otherUser,
      name: `守${createId(3)}`,
      iconId: 'busho_02',
      archetypeId: 'battle',
      provinceId: character.provinceId,
    })
    await characters.updateResources(other.id, {
      troops: 5,
      defending: 1,
      updatedAt: nowSeconds(),
    })

    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'shubi',
      positions: [0],
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const before = await characters.findById(character.id)
    const result = await executeCharacterCommand(env.DB, before!, queued)
    expect(result.ok).toBe(true)

    const after = await characters.findById(character.id)
    const otherAfter = await characters.findById(other.id)
    expect(after?.defending).toBe(1)
    expect(after?.merit).toBe((before?.merit ?? 0) + DEFEND_CONTRIBUTION)
    expect(after?.tosoEx).toBe(1)
    expect(otherAfter?.defending).toBe(0)
  })

  it('clears defending on successful move', async () => {
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
      name: `移${createId(4)}`,
      iconId: 'busho_01',
      archetypeId: 'battle',
      provinceId: 'yamashiro',
    })
    const characters = new CharacterRepository(env.DB)
    await characters.updateResources(character.id, {
      troops: 10,
      defending: 1,
      updatedAt: nowSeconds(),
    })
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'idou',
      positions: [0],
      payload: { kind: 'move', provinceId: 'omi' },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const before = await characters.findById(character.id)
    const result = await executeCharacterCommand(env.DB, before!, queued)
    expect(result.ok).toBe(true)
    const after = await characters.findById(character.id)
    expect(after?.provinceId).toBe('omi')
    expect(after?.defending).toBe(0)
  })

  it('consumes rice each turn and deserts when rice is insufficient', async () => {
    const { character } = await seedHomeCharacter()
    const characters = new CharacterRepository(env.DB)
    await characters.updateResources(character.id, {
      troops: 100,
      rice: 30,
      defending: 1,
      updatedAt: nowSeconds(),
    })

    const reports = await applyTroopUpkeep(env.DB, nowSeconds())
    const mine = reports.find((r) => r.characterId === character.id)
    expect(mine?.deserted).toBe(70)

    const after = await characters.findById(character.id)
    expect(after?.rice).toBe(0)
    expect(after?.troops).toBe(30)
    expect(after?.defending).toBe(1)

    await characters.updateResources(character.id, {
      rice: 10,
      updatedAt: nowSeconds(),
    })
    const reports2 = await applyTroopUpkeep(env.DB, nowSeconds())
    const mine2 = reports2.find((r) => r.characterId === character.id)
    expect(mine2?.deserted).toBe(20)
    const after2 = await characters.findById(character.id)
    expect(after2?.troops).toBe(10)
    expect(after2?.rice).toBe(0)

    await characters.updateResources(character.id, {
      rice: 0,
      updatedAt: nowSeconds(),
    })
    await applyTroopUpkeep(env.DB, nowSeconds())
    const after3 = await characters.findById(character.id)
    expect(after3?.troops).toBe(0)
    expect(after3?.defending).toBe(0)
  })

  it('runs upkeep during advanceDueTurns', async () => {
    const { character } = await seedHomeCharacter()
    await new CharacterRepository(env.DB).updateResources(character.id, {
      troops: 50,
      rice: 50,
      updatedAt: nowSeconds(),
    })
    const { advanced } = await advanceDueTurns(env.DB, { force: true })
    expect(advanced).toBe(1)
    const after = await new CharacterRepository(env.DB).findById(character.id)
    expect(after?.rice).toBe(0)
    expect(after?.troops).toBe(50)
  })
})
