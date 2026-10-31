import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { PROVINCES, cityRankOf, fushinCaps, getProvinceMaster } from '../src/config/provinces'
import { FUSHIN_GOLD_COST } from '../src/config/net'
import { createId, nowSeconds } from '../src/lib/id'
import { CharacterRepository } from '../src/repositories/characters'
import { CharacterCommandRepository } from '../src/repositories/character-commands'
import { ProvinceRepository } from '../src/repositories/provinces'
import { createCharacter } from '../src/services/character'
import { applyCommandsToPositions, executeCharacterCommand } from '../src/services/commands'
import { raiseHouse } from '../src/services/house'
import { ensureGameState } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'

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

describe('fushin caps', () => {
  it.each([
    ['town', 'agriculture'], ['town', 'commerce'], ['town', 'defense'],
    ['mid', 'agriculture'], ['mid', 'commerce'], ['mid', 'defense'],
    ['great', 'agriculture'], ['great', 'commerce'], ['great', 'defense'],
  ] as const)('limits %s %s fushin and preserves existing excess', async (rank, target) => {
    const provinceId = await findNeutralProvince(PROVINCES.filter((p) => cityRankOf(p) === rank).map((p) => p.id))
    const { userId, character } = await seedAt(provinceId)
    const master = getProvinceMaster(provinceId)!
    const cap = fushinCaps(master)[target]
    const key = `${target}Max` as const
    const provinces = new ProvinceRepository(env.DB)
    const characters = new CharacterRepository(env.DB)
    await provinces.updateStats(provinceId, { [key]: cap - 1, updatedAt: nowSeconds() })
    const before = (await provinces.findById(provinceId))!
    const run = async () => {
      await applyCommandsToPositions(env.DB, {
        userId, commandId: 'fushin', positions: [0], payload: { kind: 'fushin', target },
      })
      const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
      return executeCharacterCommand(env.DB, (await characters.findById(character.id))!, queued)
    }
    const result = await run()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.message).toContain('上限を+1普請した')
    const after = (await provinces.findById(provinceId))!
    expect(after[key]).toBe(cap)
    for (const other of ['agriculture', 'commerce', 'defense'] as const) {
      expect(after[other]).toBe(before[other])
      if (other !== target) expect(after[`${other}Max`]).toBe(before[`${other}Max`])
    }
    const paid = (await characters.findById(character.id))!
    expect(paid.money).toBe(character.money - FUSHIN_GOLD_COST)
    for (const existing of [cap, cap + 100]) {
      await provinces.updateStats(provinceId, { [key]: existing, updatedAt: nowSeconds() })
      const blocked = await run()
      expect(blocked.ok).toBe(false)
      if (!blocked.ok) expect(blocked.reason).toContain('普請上限')
      const unchanged = (await characters.findById(character.id))!
      expect(unchanged.money).toBe(paid.money)
      expect(unchanged.merit).toBe(paid.merit)
      expect(unchanged.countryMerit).toBe(paid.countryMerit)
      expect(unchanged.buyuEx).toBe(paid.buyuEx)
      await ensureProvincesSeeded(env.DB)
      expect((await provinces.findById(provinceId))![key]).toBe(existing)
    }
  })

})
