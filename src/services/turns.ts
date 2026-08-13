import {
  START_MONTH,
  START_YEAR,
  TURN_INTERVAL_SECONDS,
  advanceMonth,
  formatGameDate,
  isTaxMonth,
  isTributeMonth,
  type GameDate,
} from '../config/calendar'
import { getCommand } from '../config/commands'
import { nowSeconds } from '../lib/id'
import { CharacterCommandRepository } from '../repositories/character-commands'
import { CharacterRepository } from '../repositories/characters'
import { GameStateRepository } from '../repositories/game-state'
import { ProvinceRepository } from '../repositories/provinces'
import type { GameState } from '../types'
import {
  executeCharacterCommand,
  previewTaxAmount,
  previewTributeAmount,
} from './commands'
import { recordWorldEvents } from './events'

export async function ensureGameState(db: D1Database): Promise<GameState> {
  const repo = new GameStateRepository(db)
  const state = await repo.get()
  if (state.nextTurnAt === 0) {
    const now = nowSeconds()
    return repo.save({
      date: { year: state.year || START_YEAR, month: state.month || START_MONTH },
      turnIndex: state.turnIndex,
      nextTurnAt: now + TURN_INTERVAL_SECONDS,
      updatedAt: now,
    })
  }
  return state
}

export async function advanceDueTurns(
  db: D1Database,
  options: { force?: boolean; now?: number } = {},
): Promise<{ advanced: number; state: GameState }> {
  let state = await ensureGameState(db)
  const now = options.now ?? nowSeconds()
  let advanced = 0

  while (options.force || state.nextTurnAt <= now) {
    state = await advanceOneTurn(db, state, now)
    advanced += 1
    if (options.force) break
    // 遅れている分はまとめて進めるが、暴走防止
    if (advanced >= 24) break
  }

  return { advanced, state }
}

async function advanceOneTurn(
  db: D1Database,
  state: GameState,
  wallClock: number,
): Promise<GameState> {
  const characters = new CharacterRepository(db)
  const commands = new CharacterCommandRepository(db)
  const provinces = new ProvinceRepository(db)
  const eventBatch: Array<{
    year: number
    month: number
    channel: 'result' | 'news'
    kind: 'command' | 'income' | 'system'
    message: string
    provinceId?: string | null
    characterId?: string | null
    houseId?: string | null
    createdAt: number
  }> = []

  const queued = await commands.listFirstPerCharacter()
  for (const item of queued) {
    const character = await characters.findById(item.characterId)
    if (!character) {
      await commands.delete(item.id)
      continue
    }
    const province = await provinces.findById(character.provinceId)
    const definition = getCommand(item.commandId)
    const result = await executeCharacterCommand(db, character, item)
    if (result.ok && definition && province) {
      eventBatch.push({
        year: state.year,
        month: state.month,
        channel: 'result',
        kind: 'command',
        message: `${province.name}で${definition.label}を行った。`,
        provinceId: province.id,
        characterId: character.id,
        houseId: character.houseId,
        createdAt: wallClock,
      })
    }
  }

  const nextDate: GameDate = advanceMonth({ year: state.year, month: state.month })

  // 進んだ先の月で税金・年貢（その月の始めに入るイメージ）
  if (isTaxMonth(nextDate.month) || isTributeMonth(nextDate.month)) {
    const allCharacters = await characters.listAll()
    let taxed = 0
    let tributed = 0
    for (const listed of allCharacters) {
      const character = await characters.findById(listed.id)
      if (!character) continue
      const province = await provinces.findById(character.provinceId)
      if (!province) continue
      if (isTaxMonth(nextDate.month)) {
        const amount = previewTaxAmount(province)
        await characters.updateResources(character.id, {
          money: character.money + amount,
          merit: character.merit + 10,
          updatedAt: wallClock,
        })
        taxed += 1
      }
      if (isTributeMonth(nextDate.month)) {
        const amount = previewTributeAmount(province)
        await characters.updateResources(character.id, {
          rice: character.rice + amount,
          merit: character.merit + 10,
          updatedAt: wallClock,
        })
        tributed += 1
      }
    }
    if (taxed > 0) {
      eventBatch.push({
        year: nextDate.year,
        month: nextDate.month,
        channel: 'news',
        kind: 'income',
        message: `${formatGameDate(nextDate)}、各国で税収があった。`,
        createdAt: wallClock,
      })
    }
    if (tributed > 0) {
      eventBatch.push({
        year: nextDate.year,
        month: nextDate.month,
        channel: 'news',
        kind: 'income',
        message: `${formatGameDate(nextDate)}、各国で年貢が入った。`,
        createdAt: wallClock,
      })
    }
  }

  eventBatch.push({
    year: nextDate.year,
    month: nextDate.month,
    channel: 'news',
    kind: 'system',
    message: `${formatGameDate(nextDate)}になった。`,
    createdAt: wallClock,
  })

  await recordWorldEvents(db, eventBatch)

  const nextTurnAt =
    state.nextTurnAt > 0
      ? state.nextTurnAt + TURN_INTERVAL_SECONDS
      : wallClock + TURN_INTERVAL_SECONDS

  return new GameStateRepository(db).save({
    date: nextDate,
    turnIndex: state.turnIndex + 1,
    nextTurnAt: Math.max(nextTurnAt, wallClock + TURN_INTERVAL_SECONDS),
    updatedAt: wallClock,
  })
}
