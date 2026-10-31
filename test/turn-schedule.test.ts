import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { commandDate, commandTurnAt, nextScheduledAt } from '../src/config/calendar'
import { createId, nowSeconds } from '../src/lib/id'
import { CharacterRepository } from '../src/repositories/characters'
import { CharacterCommandRepository } from '../src/repositories/character-commands'
import { GameStateRepository } from '../src/repositories/game-state'
import { createCharacter } from '../src/services/character'
import { applyCommandsToPositions } from '../src/services/commands'
import { advanceDueTurns, ensureGameState } from '../src/services/turns'

// 2026-11-01 13:00 JST。世界は13:30、個人は登録時刻から30分後。
const base = Date.UTC(2026, 10, 1, 4) / 1000
const interval = 1800

async function seed(minutes: number) {
  const id = createId(12)
  await env.DB.prepare('INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)').bind(id, base, base).run()
  const character = await createCharacter(env.DB, {
    userId: id, name: `時${createId(5)}`, iconId: 'busho_01', archetypeId: 'domestic', provinceId: 'kozuke',
    turnIntervalSeconds: interval,
  })
  expect(character.nextCommandAt).toBe(character.createdAt + interval)
  await env.DB.prepare('UPDATE characters SET created_at = ?, next_command_at = ? WHERE id = ?')
    .bind(base + minutes * 60 - interval, base + minutes * 60, character.id).run()
  await applyCommandsToPositions(env.DB, { userId: id, commandId: 'nougyou', positions: [0, 1, 2, 3] })
  return character
}

async function advance(minutes: number, extra = {}) {
  return advanceDueTurns(env.DB, { now: base + minutes * 60, turnIntervalSeconds: interval, ...extra })
}

async function commandTimes(characterId: string) {
  const result = await env.DB.prepare("SELECT created_at FROM world_events WHERE character_id = ? AND channel = 'result' AND kind = 'command' ORDER BY created_at")
    .bind(characterId).all<{ created_at: number }>()
  return result.results.map((r) => r.created_at)
}

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM characters').run()
  await env.DB.prepare('DELETE FROM world_events').run()
  await env.DB.prepare('DELETE FROM turn_scheduler_lock').run()
  await new GameStateRepository(env.DB).save({ date: { year: 1467, month: 6 }, turnIndex: 5, nextTurnAt: base + interval, updatedAt: base })
})

describe('production world and personal schedules', () => {
  it('runs personal commands at different registration times and pays tribute on the world boundary', async () => {
    const a = await seed(13)
    const b = await seed(25)
    expect((await advance(12)).advanced).toBe(0)
    expect(await commandTimes(a.id)).toEqual([])
    await advance(14)
    expect(await commandTimes(a.id)).toEqual([base + 13 * 60])
    expect(await commandTimes(b.id)).toEqual([])
    await advance(14)
    expect(await commandTimes(a.id)).toHaveLength(1)
    const result = await advance(31)
    expect(result.advanced).toBe(1)
    expect(result.state.month).toBe(7)
    expect(result.state.nextTurnAt).toBe(base + 3600)
    expect(await commandTimes(b.id)).toEqual([base + 25 * 60])
    const income = await env.DB.prepare("SELECT created_at FROM world_events WHERE character_id = ? AND kind = 'income' AND channel = 'result'").bind(a.id).first<{ created_at: number }>()
    expect(income?.created_at).toBe(base + 1800)
    const news = await env.DB.prepare("SELECT created_at FROM world_events WHERE kind = 'system'").first<{ created_at: number }>()
    expect(news?.created_at).toBe(base + 1800)
    await advance(43)
    expect(await commandTimes(a.id)).toEqual([base + 13 * 60, base + 43 * 60])
  })

  it('catches up in timestamp order without drifting or executing a command twice', async () => {
    const a = await seed(13)
    const result = await advance(105)
    expect(result.advanced).toBe(3)
    expect(result.state.nextTurnAt).toBe(base + 120 * 60)
    expect(await commandTimes(a.id)).toEqual([13, 43, 73, 103].map((m) => base + m * 60))
    expect((await new CharacterRepository(env.DB).findById(a.id))?.nextCommandAt).toBe(base + 133 * 60)
    await advance(105)
    expect(await commandTimes(a.id)).toHaveLength(4)
    expect(await new CharacterCommandRepository(env.DB).listByCharacter(a.id)).toHaveLength(0)
  })

  it('initializes existing officers on a future registration grid and aligns an old world schedule', async () => {
    const a = await seed(13)
    await env.DB.prepare('UPDATE characters SET next_command_at = 0 WHERE id = ?').bind(a.id).run()
    await new GameStateRepository(env.DB).save({ date: { year: 1467, month: 6 }, turnIndex: 5, nextTurnAt: base + 17 * 60, updatedAt: base })
    const state = await ensureGameState(env.DB, interval)
    expect(state.nextTurnAt).toBe(base + 1800)
    await advance(20)
    expect(await commandTimes(a.id)).toEqual([])
    expect((await new CharacterRepository(env.DB).findById(a.id))?.nextCommandAt).toBe(base + 43 * 60)
    await advance(43)
    expect(await commandTimes(a.id)).toEqual([base + 43 * 60])
  })

  it('runs commands before income when both are due at the same boundary', async () => {
    const a = await seed(30)
    await advance(30)
    expect(await commandTimes(a.id)).toEqual([base + 1800])
    const after = (await new CharacterRepository(env.DB).findById(a.id))!
    expect(after.countryMerit).toBe(0)
    expect(after.rice).toBeGreaterThan(a.rice)
  })

  it('manual world advance keeps personal commands on their existing schedule', async () => {
    const a = await seed(13)
    const result = await advance(5, { force: true })
    expect(result.advanced).toBe(1)
    expect(result.state.nextTurnAt).toBe(base + 1800)
    expect(await commandTimes(a.id)).toEqual([])
    expect((await new CharacterRepository(env.DB).findById(a.id))?.nextCommandAt).toBe(base + 13 * 60)
  })

  it('does not execute while another scheduler owns the lock', async () => {
    const a = await seed(13)
    await env.DB.prepare('INSERT INTO turn_scheduler_lock VALUES (1, ?, ?)').bind('other', nowSeconds() + 120).run()
    expect((await advance(31)).advanced).toBe(0)
    expect(await commandTimes(a.id)).toEqual([])
  })

  it('serializes simultaneous scheduler calls and recovers an expired lock', async () => {
    const a = await seed(13)
    await env.DB.prepare('INSERT INTO turn_scheduler_lock VALUES (1, ?, ?)').bind('expired', nowSeconds() - 1).run()
    await Promise.all([advance(31), advance(31)])
    expect(await commandTimes(a.id)).toEqual([base + 13 * 60])
    expect((await new GameStateRepository(env.DB).get()).month).toBe(7)
    expect(await env.DB.prepare('SELECT * FROM turn_scheduler_lock').first()).toBeNull()
  })

  it('starts a new world on the next half-hour boundary', async () => {
    await new GameStateRepository(env.DB).save({ date: { year: 1467, month: 1 }, turnIndex: 0, nextTurnAt: 0, updatedAt: 0 })
    const before = nowSeconds()
    const state = await ensureGameState(env.DB, interval)
    expect(state.nextTurnAt % interval).toBe(0)
    expect(state.nextTurnAt).toBeGreaterThan(before)
    expect(state.nextTurnAt).toBeLessThanOrEqual(nowSeconds() + interval)
  })

  it('keeps the 60-second staging schedule unsnapped', async () => {
    const a = await seed(13)
    const scheduled = base + 13
    await new GameStateRepository(env.DB).save({ date: { year: 1467, month: 6 }, turnIndex: 5, nextTurnAt: scheduled, updatedAt: base })
    const result = await advanceDueTurns(env.DB, { now: scheduled, turnIntervalSeconds: 60 })
    expect(result.state.nextTurnAt).toBe(scheduled + 60)
    expect(await commandTimes(a.id)).toEqual([scheduled])
  })

  it('resumes a backlog larger than 24 groups on subsequent calls', async () => {
    const a = await seed(13)
    const first = await advance(1000)
    expect(first.advanced).toBe(12)
    expect(first.state.nextTurnAt).toBeLessThan(base + 1000 * 60)
    await advance(1000)
    await advance(1000)
    const state = (await advance(1000)).state
    expect(state.turnIndex).toBe(5 + 33)
    expect(state.nextTurnAt).toBe(base + 1020 * 60)
    expect(await commandTimes(a.id)).toHaveLength(4)
  })

  it('calculates boundary and command dates including month rollover', () => {
    const old = { createdAt: base - 17 * 60, nextCommandAt: 0 }
    expect(commandTurnAt(old, base + 1800, interval, base + 20 * 60)).toBe(base + 43 * 60)
    expect(commandTurnAt(old, base + 13, 60, base)).toBe(base + 13)
    expect(nextScheduledAt(base + 13 * 60, interval)).toBe(base + 1800)
    expect(nextScheduledAt(base + 1800, interval)).toBe(base + 3600)
    expect(commandDate({ year: 1467, month: 12 }, base + 1800, base + 1800, interval)).toEqual({ year: 1467, month: 12 })
    expect(commandDate({ year: 1467, month: 12 }, base + 1800, base + 43 * 60, interval)).toEqual({ year: 1468, month: 1 })
  })
})
