import {
  START_MONTH,
  START_YEAR,
  TURN_INTERVAL_SECONDS,
  advanceMonth,
  isTaxMonth,
  isTributeMonth,
  type GameDate,
} from '../config/calendar'
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

  const queued = await commands.listFirstPerCharacter()
  for (const item of queued) {
    const character = await characters.findById(item.characterId)
    if (!character) {
      await commands.delete(item.id)
      continue
    }
    await executeCharacterCommand(db, character, item)
  }

  const nextDate: GameDate = advanceMonth({ year: state.year, month: state.month })

  // 進んだ先の月で税金・年貢（その月の始めに入るイメージ）
  if (isTaxMonth(nextDate.month) || isTributeMonth(nextDate.month)) {
    const allCharacters = await characters.listAll()
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
      }
      if (isTributeMonth(nextDate.month)) {
        const amount = previewTributeAmount(province)
        await characters.updateResources(character.id, {
          rice: character.rice + amount,
          merit: character.merit + 10,
          updatedAt: wallClock,
        })
      }
    }
  }

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
