import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import {
  COMMAND_QUEUE_MAX,
  COMMANDS,
  STAT_EX_PER_LEVEL,
  buildCommandSlots,
  effectLabel,
  formatEffectAmount,
  getCommand,
  visibleEffects,
} from '../src/config/commands'
import { START_MONTH, START_YEAR, advanceMonth, dateAtQueueOffset, formatGameDate, monthAtQueueOffset, seasonLabel, seasonOfMonth } from '../src/config/calendar'
import {
  applyCommandsToPositions,
  clearCommandPositions,
  enqueueCommand,
  executeCharacterCommand,
  repeatSelectedCommands,
} from '../src/services/commands'
import { createCharacter } from '../src/services/character'
import { advanceDueTurns, ensureGameState } from '../src/services/turns'
import { listActionResults, listWorldNews } from '../src/services/events'
import { ensureProvincesSeeded } from '../src/services/world'
import { CharacterCommandRepository } from '../src/repositories/character-commands'
import { CharacterRepository } from '../src/repositories/characters'
import { ProvinceRepository } from '../src/repositories/provinces'
import { createId, nowSeconds } from '../src/lib/id'

describe('phase2 calendar and commands', () => {
  it('starts at 1467/1 and advances by month', () => {
    expect(START_YEAR).toBe(1467)
    expect(START_MONTH).toBe(1)
    expect(formatGameDate({ year: 1467, month: 12 })).toBe('1467年12月')
    expect(advanceMonth({ year: 1467, month: 12 })).toEqual({ year: 1468, month: 1 })
  })

  it('maps months to seasons', () => {
    expect(seasonOfMonth(1)).toBe('winter')
    expect(seasonOfMonth(4)).toBe('spring')
    expect(seasonOfMonth(7)).toBe('summer')
    expect(seasonOfMonth(10)).toBe('autumn')
    expect(seasonLabel('spring')).toBe('春')
  })

  it('maps queue offsets to calendar months', () => {
    expect(monthAtQueueOffset(1, 0)).toBe(1)
    expect(monthAtQueueOffset(1, 11)).toBe(12)
    expect(monthAtQueueOffset(1, 12)).toBe(1)
    expect(monthAtQueueOffset(11, 2)).toBe(1)
    expect(dateAtQueueOffset({ year: 1467, month: 1 }, 0)).toEqual({ year: 1467, month: 1 })
    expect(dateAtQueueOffset({ year: 1467, month: 11 }, 2)).toEqual({ year: 1468, month: 1 })
    expect(formatGameDate(dateAtQueueOffset({ year: 1467, month: 1 }, 12))).toBe('1468年1月')
  })

  it('shows numeric effect amounts for UI chips', () => {
    expect(COMMANDS.map((c) => c.id)).toEqual([
      'kaikon',
      'ichitate',
      'keiko',
      'seimu',
      'komehodokoshi',
    ])
    const kaikon = getCommand('kaikon')!
    const chips = visibleEffects(kaikon)
    expect(chips[0]).toMatchObject({ target: 'agriculture', magnitude: 'up2', amount: 8 })
    expect(effectLabel('agriculture')).toBe('農業')
    expect(formatEffectAmount(chips[0])).toBe('+8')
    expect(formatEffectAmount(chips[1])).toBe('+1 EX')
    expect(formatEffectAmount(chips[2])).toBe('-50 両')
    expect(STAT_EX_PER_LEVEL).toBe(20)
    expect(getCommand('keiko')!.effects[0]).toMatchObject({ target: 'buyu', amount: 2 })
    expect(getCommand('seimu')!.effects[0]).toMatchObject({ target: 'chiryaku', amount: 1 })
  })

  it('enqueues and executes kaikon on turn advance', async () => {
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
      name: `試${createId(4)}`,
      iconId: 'busho_01',
      archetypeId: 'domestic',
      provinceId: 'yamashiro',
    })

    const beforeProvince = await new ProvinceRepository(env.DB).findById('yamashiro')
    expect(beforeProvince).not.toBeNull()

    await enqueueCommand(env.DB, { userId, commandId: 'kaikon' })
    const queue = await new CharacterCommandRepository(env.DB).listByCharacter(character.id)
    expect(queue).toHaveLength(1)

    const { advanced, state } = await advanceDueTurns(env.DB, { force: true })
    expect(advanced).toBe(1)
    expect(state.month).toBe(2)

    const afterCharacter = await new CharacterRepository(env.DB).findById(character.id)
    const afterProvince = await new ProvinceRepository(env.DB).findById('yamashiro')
    const afterQueue = await new CharacterCommandRepository(env.DB).listByCharacter(character.id)

    expect(afterQueue).toHaveLength(0)
    expect(afterCharacter?.money).toBe(character.money - 50)
    expect(afterProvince?.agriculture).toBe((beforeProvince?.agriculture ?? 0) + 8)
    expect(afterCharacter?.chiryakuEx).toBe(1)

    const results = await listActionResults(env.DB, character.id)
    const news = await listWorldNews(env.DB)
    expect(results.some((event) => event.kind === 'command')).toBe(true)
    expect(news.some((event) => event.kind === 'system')).toBe(true)
    expect(news.every((event) => event.kind !== 'command')).toBe(true)
  })

  it('writes selected slots, keeps empty as 無し, and repeats a pattern', async () => {
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
      name: `枠${createId(4)}`,
      iconId: 'busho_03',
      archetypeId: 'domestic',
      provinceId: 'yamashiro',
    })

    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'kaikon',
      positions: [0, 2],
    })
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'ichitate',
      positions: [1],
    })

    const commands = new CharacterCommandRepository(env.DB)
    let queue = await commands.listByCharacter(character.id)
    let slots = buildCommandSlots(queue)
    expect(slots).toHaveLength(COMMAND_QUEUE_MAX)
    expect(slots[0]?.commandId).toBe('kaikon')
    expect(slots[1]?.commandId).toBe('ichitate')
    expect(slots[2]?.commandId).toBe('kaikon')
    expect(slots[3]).toBeNull()

    await clearCommandPositions(env.DB, { userId, positions: [1] })
    queue = await commands.listByCharacter(character.id)
    slots = buildCommandSlots(queue)
    expect(slots[1]).toBeNull()
    expect(slots[2]?.commandId).toBe('kaikon')

    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'ichitate',
      positions: [1],
    })
    await repeatSelectedCommands(env.DB, { userId, positions: [0, 1] })
    queue = await commands.listByCharacter(character.id)
    slots = buildCommandSlots(queue)
    expect(slots[2]?.commandId).toBe('kaikon')
    expect(slots[3]?.commandId).toBe('ichitate')
    expect(slots[4]?.commandId).toBe('kaikon')
    expect(slots[COMMAND_QUEUE_MAX - 1]?.commandId).toBe('ichitate')
  })

  it('rejects rice gift without rice', async () => {
    await ensureProvincesSeeded(env.DB)
    const userId = createId(12)
    await env.DB.prepare(
      `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
    )
      .bind(userId, nowSeconds(), nowSeconds())
      .run()

    const character = await createCharacter(env.DB, {
      userId,
      name: `米${createId(4)}`,
      iconId: 'busho_02',
      archetypeId: 'domestic',
      provinceId: 'yamashiro',
    })

    await new CharacterRepository(env.DB).updateResources(character.id, {
      rice: 10,
      updatedAt: nowSeconds(),
    })
    const poor = await new CharacterRepository(env.DB).findById(character.id)
    expect(poor).not.toBeNull()

    const queued = await enqueueCommand(env.DB, { userId, commandId: 'komehodokoshi' })
    const result = await executeCharacterCommand(env.DB, poor!, queued[0]!)
    expect(result.ok).toBe(false)
  })
})
