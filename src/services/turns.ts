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
import { CHARACTER_RANKS } from '../config/game'
import { CLASS_PER_RANK, SALARY_RANK_MAX } from '../config/net'
import { getCommand } from '../config/commands'
import { nowSeconds } from '../lib/id'
import { CharacterCommandRepository } from '../repositories/character-commands'
import { CharacterRepository } from '../repositories/characters'
import { GameStateRepository } from '../repositories/game-state'
import { ProvinceRepository } from '../repositories/provinces'
import type { Character, GameState, Province } from '../types'
import {
  applyLoyaltyPopulationDelta,
  characterIncomeShare,
  executeCharacterCommand,
  houseIncomePool,
  nextMarketRate,
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
    if (advanced >= 24) break
  }

  return { advanced, state }
}

function rankFromClassPoints(classPoints: number): number {
  const sNum = Math.min(SALARY_RANK_MAX, Math.floor(classPoints / CLASS_PER_RANK))
  const maxId = CHARACTER_RANKS[CHARACTER_RANKS.length - 1]?.id ?? 1
  return Math.min(maxId, Math.max(1, sNum + 1))
}

function maybePromoteStats(character: Character, meritAdded: number, beforeClass: number) {
  if (meritAdded <= 0) return character
  if (beforeClass % CLASS_PER_RANK + meritAdded <= CLASS_PER_RANK) return character
  const roll = Math.floor(Math.random() * 3)
  if (roll === 0) return { ...character, buyu: character.buyu + 1 }
  if (roll === 1) return { ...character, chiryaku: character.chiryaku + 1 }
  return { ...character, toso: character.toso + 1 }
}

async function paySeasonalIncome(
  db: D1Database,
  nextDate: GameDate,
  wallClock: number,
  kind: 'tax' | 'tribute',
): Promise<number> {
  const characters = new CharacterRepository(db)
  const provinces = new ProvinceRepository(db)
  const all = await characters.listAll()

  // 家ごとの領土・貢献合計
  const houseIds = new Set<string>()
  for (const c of all) {
    if (c.houseId) houseIds.add(c.houseId)
  }

  const houseOwned = new Map<string, Province[]>()
  const houseMerit = new Map<string, number>()
  for (const houseId of houseIds) {
    houseOwned.set(houseId, await provinces.listByHouseId(houseId))
    const members = await characters.listByHouseId(houseId)
    houseMerit.set(
      houseId,
      members.reduce((sum, m) => sum + m.merit, 0),
    )
  }

  let paid = 0
  for (const listed of all) {
    let character = await characters.findById(listed.id)
    if (!character) continue

    let amount = 0
    if (character.houseId) {
      const owned = houseOwned.get(character.houseId) ?? []
      const pool = houseIncomePool(owned, kind)
      const totalMerit = houseMerit.get(character.houseId) ?? 0
      amount = characterIncomeShare(pool, character.merit, totalMerit, character.classPoints)
    } else {
      // 浪人: 所在国のみ・自分の貢献だけ
      const province = await provinces.findById(character.provinceId)
      if (province) {
        const pool = houseIncomePool([province], kind)
        amount = characterIncomeShare(pool, character.merit, character.merit || 1, character.classPoints)
      }
    }

    const beforeClass = character.classPoints
    const meritAdded = character.merit
    const nextClass = beforeClass + meritAdded
    character = {
      ...character,
      money: kind === 'tax' ? character.money + amount : character.money,
      rice: kind === 'tribute' ? character.rice + amount : character.rice,
      classPoints: nextClass,
      merit: 0,
      rank: rankFromClassPoints(nextClass),
    }
    character = maybePromoteStats(character, meritAdded, beforeClass)

    await characters.updateResources(character.id, {
      money: character.money,
      rice: character.rice,
      merit: 0,
      classPoints: character.classPoints,
      rank: character.rank,
      buyu: character.buyu,
      chiryaku: character.chiryaku,
      toso: character.toso,
      updatedAt: wallClock,
    })
    paid += 1
  }

  return paid
}

async function applySeasonalPopulation(db: D1Database, wallClock: number): Promise<void> {
  const provinces = new ProvinceRepository(db)
  const all = await provinces.listAll()
  for (const province of all) {
    const delta = applyLoyaltyPopulationDelta(province)
    const marketRate = nextMarketRate(province.marketRate)
    if (delta === 0 && marketRate === province.marketRate) continue
    await provinces.updateStats(province.id, {
      population: province.population + delta,
      marketRate,
      updatedAt: wallClock,
    })
  }
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
        message: result.message,
        provinceId: province.id,
        characterId: character.id,
        houseId: character.houseId,
        createdAt: wallClock,
      })
    } else if (!result.ok && definition && province) {
      eventBatch.push({
        year: state.year,
        month: state.month,
        channel: 'result',
        kind: 'command',
        message: `${definition.label}に失敗した（${result.reason}）。`,
        provinceId: province.id,
        characterId: character.id,
        houseId: character.houseId,
        createdAt: wallClock,
      })
      // 失敗しても枠は消化（原本もコマンドは進む）
      await commands.delete(item.id)
      await commands.shiftDownAfter(character.id, item.position)
    }
  }

  const nextDate: GameDate = advanceMonth({ year: state.year, month: state.month })

  if (isTaxMonth(nextDate.month) || isTributeMonth(nextDate.month)) {
    await applySeasonalPopulation(db, wallClock)
    if (isTaxMonth(nextDate.month)) {
      const taxed = await paySeasonalIncome(db, nextDate, wallClock, 'tax')
      if (taxed > 0) {
        eventBatch.push({
          year: nextDate.year,
          month: nextDate.month,
          channel: 'news',
          kind: 'income',
          message: `${formatGameDate(nextDate)}、税金で各武将に給与が支払われた。`,
          createdAt: wallClock,
        })
      }
    }
    if (isTributeMonth(nextDate.month)) {
      const tributed = await paySeasonalIncome(db, nextDate, wallClock, 'tribute')
      if (tributed > 0) {
        eventBatch.push({
          year: nextDate.year,
          month: nextDate.month,
          channel: 'news',
          kind: 'income',
          message: `${formatGameDate(nextDate)}、収穫で各武将に米が支払われた。`,
          createdAt: wallClock,
        })
      }
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
