/**
 * コア一周: 建国 → 内政 → 徴兵 → 戦争 → 占領
 */
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { BATTLE_STOP_MONTHS } from '../src/config/net'
import { PROVINCES } from '../src/config/provinces'
import { listAdjacentIds } from '../src/domain/province/adjacency'
import { createId, nowSeconds } from '../src/lib/id'
import { CharacterCommandRepository } from '../src/repositories/character-commands'
import { CharacterRepository } from '../src/repositories/characters'
import { ProvinceRepository } from '../src/repositories/provinces'
import { createCharacter } from '../src/services/character'
import {
  applyCommandsToPositions,
  executeCharacterCommand,
} from '../src/services/commands'
import { raiseHouse } from '../src/services/house'
import { ensureGameState } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'

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

describe('scenario: core conquest loop', () => {
  it('founds, develops, recruits, and occupies an adjacent land', async () => {
    const { from, to } = await findNeutralAdjacentPair()
    const userId = createId(12)
    await env.DB.prepare(
      `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
    )
      .bind(userId, nowSeconds(), nowSeconds())
      .run()

    const created = await createCharacter(env.DB, {
      userId,
      name: `周${createId(4)}`,
      iconId: 'busho_01',
      archetypeId: 'battle',
      provinceId: from,
      buyu: '70',
      chiryaku: '40',
      toso: '40',
    })
    await raiseHouse(env.DB, { userId, houseName: `周家${createId(2)}` })
    let character = (await new CharacterRepository(env.DB).findById(created.id))!

    const state = await ensureGameState(env.DB)
    await env.DB.prepare(`UPDATE houses SET founded_turn = ? WHERE id = ?`)
      .bind(state.turnIndex - BATTLE_STOP_MONTHS, character.houseId!)
      .run()

    // 内政
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'nougyou',
      positions: [0],
    })
    const agriBefore = (await new ProvinceRepository(env.DB).findById(from))!.agriculture
    const commands = new CharacterCommandRepository(env.DB)
    let queued = (await commands.listByCharacter(character.id))[0]!
    let result = await executeCharacterCommand(env.DB, character, queued)
    expect(result.ok).toBe(true)
    const agriAfter = (await new ProvinceRepository(env.DB).findById(from))!.agriculture
    expect(agriAfter).toBeGreaterThanOrEqual(agriBefore)

    character = (await new CharacterRepository(env.DB).findById(character.id))!

    // 徴兵
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'chouhei',
      positions: [0],
      payload: { kind: 'recruit', amount: 20 },
    })
    queued = (await commands.listByCharacter(character.id))[0]!
    result = await executeCharacterCommand(env.DB, character, queued)
    expect(result.ok).toBe(true)
    character = (await new CharacterRepository(env.DB).findById(character.id))!
    expect(character.troops).toBeGreaterThanOrEqual(20)

    // 城壁を薄くして占領まで通す（式自体は unit / N4 で担保）
    await new ProvinceRepository(env.DB).updateStats(to, {
      defense: 5,
      updatedAt: nowSeconds(),
    })

    // 戦争 → 占領
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'sensou',
      positions: [0],
      payload: { kind: 'war', provinceId: to },
    })
    queued = (await commands.listByCharacter(character.id))[0]!
    result = await executeCharacterCommand(env.DB, character, queued)
    expect(result.ok).toBe(true)

    const target = await new ProvinceRepository(env.DB).findById(to)
    expect(target?.houseId).toBe(character.houseId)
  })
})
