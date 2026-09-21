import { STAT_MIN } from '../config/archetypes'
import {
  parseCommandPayload,
  serializeCommandPayload,
  type CommandPayload,
  type RecruitOfficerPayload,
  type RecruitPayload,
  type TradePayload,
  type TrainStatPayload,
  type WarPayload,
} from '../config/command-payload'
import {
  COMMAND_QUEUE_MAX,
  buildCommandSlots,
  getCommand,
  isCommandId,
  parseSlotPositions,
} from '../config/commands'
import {
  CLASS_PER_RANK,
  COMMAND_CONTRIBUTION,
  DEFEND_CONTRIBUTION,
  DOMESTIC_GOLD_COST,
  MARKET_RATE_MAX,
  MARKET_RATE_MIN,
  MOVE_CONTRIBUTION,
  RECRUIT_CONTRIBUTION,
  RECRUIT_GOLD_PER,
  RECRUIT_OFFICER_GOLD_COST,
  RECRUIT_POP_PER,
  RICE_GIVE_COST,
  SALARY_BASE_CAP,
  SALARY_CAP_PER_RANK,
  SALARY_RANK_MAX,
  STAT_EX_PER_LEVEL,
  TECH_MAX,
  TRADE_MAX,
  TRAIN_CONTRIBUTION,
  TRAIN_STAT_CONTRIBUTION,
  TRAIN_STAT_EX_GAIN,
  TRAIN_STAT_GOLD_COST,
  TRAINING_MAX,
  WAR_CONTRIBUTION,
  isHouseWarReady,
  netStatGain,
  netTrainGain,
} from '../config/net'
import { getProvinceMaster } from '../config/provinces'
import { areAdjacent } from '../domain/province/adjacency'
import { createId, nowSeconds } from '../lib/id'
import { CharacterCommandRepository } from '../repositories/character-commands'
import { CharacterRepository } from '../repositories/characters'
import { GameStateRepository } from '../repositories/game-state'
import { HouseRoleRepository } from '../repositories/house-roles'
import { HouseRepository } from '../repositories/houses'
import { ProvinceRepository } from '../repositories/provinces'
import { UnitRepository } from '../repositories/units'
import { HOUSE_ROLES } from '../config/game'
import type { Character, CharacterCommand, Province } from '../types'
import { resolveBattle, wallDefender } from './battle'
import { DomainError } from './character'
import { recordWorldEvent } from './events'
import { recruitOfficerSucceeds } from './recruit-officer'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

async function requireOwnedCharacter(db: D1Database, userId: string) {
  const characters = new CharacterRepository(db)
  const character = await characters.findByUserId(userId)
  if (!character) throw new DomainError('武将が見つかりません')
  return character
}

function normalizePositions(raw: Array<number | string>): number[] {
  return parseSlotPositions(raw.map(String))
}

/** 能力に上限はない。EX が溜まるたびに +1 */
export function applyStatEx(
  current: number,
  currentEx: number,
  gain: number,
): { value: number; ex: number } {
  let value = current
  let ex = currentEx + gain
  while (ex >= STAT_EX_PER_LEVEL) {
    ex -= STAT_EX_PER_LEVEL
    value += 1
  }
  return { value, ex }
}

/** 自国にいるか（浪人×中立は可。原本: zcon==kcon） */
export function isInHomeLand(character: Character, province: Province): boolean {
  if (!character.houseId && !province.houseId) return true
  return Boolean(character.houseId && province.houseId === character.houseId)
}

export function buildTradePayload(input: {
  side: 'sell_rice' | 'sell_gold'
  amount: number
  marketRate: number
}): TradePayload {
  const amount = Math.floor(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError('売買する数を入力してください')
  }
  if (amount > TRADE_MAX) {
    throw new DomainError(`一度に扱えるのは${TRADE_MAX}までです`)
  }
  return {
    kind: 'trade',
    side: input.side,
    amount,
    marketRate: input.marketRate,
  }
}

export function buildRecruitPayload(input: { amount: number }): RecruitPayload {
  const amount = Math.floor(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError('徴兵する人数を入力してください')
  }
  return { kind: 'recruit', amount }
}

export function buildWarPayload(input: { provinceId: string }): WarPayload {
  if (!input.provinceId || !getProvinceMaster(input.provinceId)) {
    throw new DomainError('攻撃先を選んでください')
  }
  return { kind: 'war', provinceId: input.provinceId }
}

export function buildTrainStatPayload(input: {
  stat: string
}): TrainStatPayload {
  if (input.stat !== 'buyu' && input.stat !== 'chiryaku' && input.stat !== 'toso') {
    throw new DomainError('鍛錬する能力を選んでください')
  }
  return { kind: 'train_stat', stat: input.stat }
}

export function buildRecruitOfficerPayload(input: {
  targetCharacterId: string
}): RecruitOfficerPayload {
  if (!input.targetCharacterId) {
    throw new DomainError('登用する武将を選んでください')
  }
  return { kind: 'recruit_officer', targetCharacterId: input.targetCharacterId }
}

function resolvePayloadForApply(
  commandId: string,
  raw: CommandPayload | null | undefined,
): string | null {
  const def = getCommand(commandId)
  if (!def) throw new DomainError('コマンドが不正です')
  if (def.needsPayload === 'move') {
    if (!raw || raw.kind !== 'move') throw new DomainError('移動先を選んでください')
    if (!getProvinceMaster(raw.provinceId)) throw new DomainError('移動先が不正です')
    return serializeCommandPayload(raw)
  }
  if (def.needsPayload === 'trade') {
    if (!raw || raw.kind !== 'trade') throw new DomainError('売買の内容を指定してください')
    return serializeCommandPayload(raw)
  }
  if (def.needsPayload === 'recruit') {
    if (!raw || raw.kind !== 'recruit') throw new DomainError('徴兵する人数を入力してください')
    return serializeCommandPayload(buildRecruitPayload({ amount: raw.amount }))
  }
  if (def.needsPayload === 'war') {
    if (!raw || raw.kind !== 'war') throw new DomainError('攻撃先を選んでください')
    return serializeCommandPayload(buildWarPayload({ provinceId: raw.provinceId }))
  }
  if (def.needsPayload === 'train_stat') {
    if (!raw || raw.kind !== 'train_stat') throw new DomainError('鍛錬する能力を選んでください')
    return serializeCommandPayload(buildTrainStatPayload({ stat: raw.stat }))
  }
  if (def.needsPayload === 'recruit_officer') {
    if (!raw || raw.kind !== 'recruit_officer') {
      throw new DomainError('登用する武将を選んでください')
    }
    return serializeCommandPayload(
      buildRecruitOfficerPayload({ targetCharacterId: raw.targetCharacterId }),
    )
  }
  return null
}

/** 選択した枠にコマンドを書き込む（空き＝無しの枠も含む） */
export async function applyCommandsToPositions(
  db: D1Database,
  input: {
    userId: string
    commandId: string
    positions: Array<number | string>
    payload?: CommandPayload | null
  },
): Promise<void> {
  if (!isCommandId(input.commandId)) {
    throw new DomainError('コマンドが不正です')
  }
  const positions = normalizePositions(input.positions)
  if (positions.length === 0) {
    throw new DomainError('入力する予約枠を選んでください')
  }

  const payloadJson = resolvePayloadForApply(input.commandId, input.payload ?? null)
  const character = await requireOwnedCharacter(db, input.userId)
  const commands = new CharacterCommandRepository(db)
  const queue = await commands.listByCharacter(character.id)
  const byPosition = new Map(queue.map((row) => [row.position, row]))
  const createdAt = nowSeconds()

  const updates: Array<{ id: string; commandId: string; payload: string | null }> = []
  const inserts: Array<{
    id: string
    characterId: string
    commandId: string
    position: number
    payload: string | null
    createdAt: number
  }> = []

  for (const position of positions) {
    const existing = byPosition.get(position)
    if (existing) {
      updates.push({ id: existing.id, commandId: input.commandId, payload: payloadJson })
    } else {
      inserts.push({
        id: createId(16),
        characterId: character.id,
        commandId: input.commandId,
        position,
        payload: payloadJson,
        createdAt,
      })
    }
  }

  await commands.updateCommands(updates)
  await commands.enqueueMany(inserts)
}

/** 互換: 先頭の空き枠へ1件追加 */
export async function enqueueCommand(
  db: D1Database,
  input: { userId: string; commandId: string; count?: number },
): Promise<CharacterCommand[]> {
  const character = await requireOwnedCharacter(db, input.userId)
  const commands = new CharacterCommandRepository(db)
  const slots = buildCommandSlots(await commands.listByCharacter(character.id))
  const count = clamp(Math.floor(input.count ?? 1), 1, COMMAND_QUEUE_MAX)
  const positions: number[] = []
  for (let i = 0; i < slots.length && positions.length < count; i += 1) {
    if (!slots[i]) positions.push(i)
  }
  if (positions.length === 0) {
    throw new DomainError(`コマンドは最大${COMMAND_QUEUE_MAX}までです`)
  }
  await applyCommandsToPositions(db, {
    userId: input.userId,
    commandId: input.commandId,
    positions,
  })
  const next = await commands.listByCharacter(character.id)
  return next.filter((row) => positions.includes(row.position))
}

/** 選択枠を空に戻す（詰めない。すでに空の枠は無視） */
export async function clearCommandPositions(
  db: D1Database,
  input: { userId: string; positions: Array<number | string> },
): Promise<void> {
  const positions = normalizePositions(input.positions)
  if (positions.length === 0) {
    throw new DomainError('削除する予約枠を選んでください')
  }

  const character = await requireOwnedCharacter(db, input.userId)
  const commands = new CharacterCommandRepository(db)
  const queue = await commands.listByCharacter(character.id)
  const selected = new Set(positions)
  const targets = queue.filter((row) => selected.has(row.position)).map((row) => row.id)
  if (targets.length === 0) return
  await commands.deleteMany(targets)
}

export async function cancelQueuedCommand(
  db: D1Database,
  input: { userId: string; queueId: string },
): Promise<void> {
  const character = await requireOwnedCharacter(db, input.userId)
  const commands = new CharacterCommandRepository(db)
  const queue = await commands.listByCharacter(character.id)
  const target = queue.find((row) => row.id === input.queueId)
  if (!target) throw new DomainError('予約コマンドが見つかりません')
  await commands.delete(target.id)
}

export async function cancelQueuedCommands(
  db: D1Database,
  input: { userId: string; queueIds: string[] },
): Promise<void> {
  const queueIds = [...new Set(input.queueIds.filter(Boolean))]
  if (queueIds.length === 0) {
    throw new DomainError('取り消す予約を選んでください')
  }
  const character = await requireOwnedCharacter(db, input.userId)
  const commands = new CharacterCommandRepository(db)
  const queue = await commands.listByCharacter(character.id)
  const owned = new Set(queue.map((row) => row.id))
  const targets = queueIds.filter((id) => owned.has(id))
  if (targets.length === 0) {
    throw new DomainError('予約コマンドが見つかりません')
  }
  await commands.deleteMany(targets)
}

/**
 * 選択した枠の並びを、その直後から末尾まで繰り返して書き込む。
 */
export async function repeatSelectedCommands(
  db: D1Database,
  input: { userId: string; positions: Array<number | string> },
): Promise<void> {
  const positions = normalizePositions(input.positions)
  if (positions.length === 0) {
    throw new DomainError('繰り返す予約枠を選んでください')
  }

  const character = await requireOwnedCharacter(db, input.userId)
  const commands = new CharacterCommandRepository(db)
  const slots = buildCommandSlots(await commands.listByCharacter(character.id))
  const pattern = positions.map((position) => {
    const row = slots[position]
    if (!row) throw new DomainError('無しの枠は繰返の元にできません')
    return row.commandId
  })

  const start = positions[positions.length - 1]! + 1
  if (start >= COMMAND_QUEUE_MAX) {
    throw new DomainError('繰返して埋める空きがありません')
  }

  const writePositions = Array.from(
    { length: COMMAND_QUEUE_MAX - start },
    (_, offset) => start + offset,
  )
  const byPosition = new Map(
    (await commands.listByCharacter(character.id)).map((row) => [row.position, row]),
  )
  const createdAt = nowSeconds()
  const updates: Array<{ id: string; commandId: string; payload: string | null }> = []
  const inserts: Array<{
    id: string
    characterId: string
    commandId: string
    position: number
    payload: string | null
    createdAt: number
  }> = []

  writePositions.forEach((position, offset) => {
    const source = slots[positions[offset % positions.length]!]!
    const commandId = pattern[offset % pattern.length]!
    const existing = byPosition.get(position)
    if (existing) {
      updates.push({
        id: existing.id,
        commandId,
        payload: source.payload ?? null,
      })
    } else {
      inserts.push({
        id: createId(16),
        characterId: character.id,
        commandId,
        position,
        payload: source.payload ?? null,
        createdAt,
      })
    }
  })

  await commands.updateCommands(updates)
  await commands.enqueueMany(inserts)
}

type MutableCharacter = {
  money: number
  rice: number
  troops: number
  training: number
  defending: number
  merit: number
  buyu: number
  chiryaku: number
  toso: number
  tokubo: number
  buyuEx: number
  chiryakuEx: number
  tosoEx: number
  tokuboEx: number
}

type MutableProvince = {
  agriculture: number
  agricultureMax: number
  commerce: number
  commerceMax: number
  defense: number
  defenseMax: number
  loyalty: number
  population: number
  populationMax: number
  tech: number
}

export type CommandExecutionOk = {
  ok: true
  message: string
}

export type CommandExecutionFail = {
  ok: false
  reason: string
}

function gainChiryakuEx(state: MutableCharacter): void {
  const next = applyStatEx(state.chiryaku, state.chiryakuEx, 1)
  state.chiryaku = next.value
  state.chiryakuEx = next.ex
}

function gainTokuboEx(state: MutableCharacter): void {
  const next = applyStatEx(state.tokubo, state.tokuboEx, 1)
  state.tokubo = Math.max(STAT_MIN, next.value)
  state.tokuboEx = next.ex
}

function gainBuyuEx(state: MutableCharacter): void {
  const next = applyStatEx(state.buyu, state.buyuEx, 1)
  state.buyu = next.value
  state.buyuEx = next.ex
}

function gainTosoEx(state: MutableCharacter): void {
  const next = applyStatEx(state.toso, state.tosoEx, 1)
  state.toso = next.value
  state.tosoEx = next.ex
}

async function consumeQueuedCommand(
  db: D1Database,
  characterId: string,
  queued: CharacterCommand,
): Promise<void> {
  const commands = new CharacterCommandRepository(db)
  await commands.delete(queued.id)
  await commands.shiftDownAfter(characterId, queued.position)
}

async function finishCommand(
  db: D1Database,
  character: Character,
  queued: CharacterCommand,
  personal: MutableCharacter,
  local: MutableProvince,
): Promise<void> {
  const now = nowSeconds()
  const characters = new CharacterRepository(db)
  const provinces = new ProvinceRepository(db)
  await characters.updateResources(character.id, { ...personal, updatedAt: now })
  await provinces.updateStats(character.provinceId, {
    agriculture: local.agriculture,
    commerce: local.commerce,
    defense: local.defense,
    loyalty: local.loyalty,
    population: local.population,
    tech: local.tech,
    updatedAt: now,
  })
  await consumeQueuedCommand(db, character.id, queued)
}

/**
 * NETコマンドを1件実行。成功メッセージに上昇量を含める。
 */
export async function executeCharacterCommand(
  db: D1Database,
  character: Character,
  queued: CharacterCommand,
): Promise<CommandExecutionOk | CommandExecutionFail> {
  const definition = getCommand(queued.commandId)
  if (!definition) {
    return { ok: false, reason: '不明なコマンド' }
  }

  const provinces = new ProvinceRepository(db)
  const province = await provinces.findById(character.provinceId)
  if (!province) {
    return { ok: false, reason: '所在国がありません' }
  }

  const home = isInHomeLand(character, province)
  if (!home && !definition.foreignOk) {
    return { ok: false, reason: '自国以外では実行できません' }
  }

  const personal: MutableCharacter = {
    money: character.money,
    rice: character.rice,
    troops: character.troops,
    training: character.training,
    defending: character.defending,
    merit: character.merit,
    buyu: character.buyu,
    chiryaku: character.chiryaku,
    toso: character.toso,
    tokubo: character.tokubo,
    buyuEx: character.buyuEx,
    chiryakuEx: character.chiryakuEx,
    tosoEx: character.tosoEx,
    tokuboEx: character.tokuboEx,
  }
  const local: MutableProvince = {
    agriculture: province.agriculture,
    agricultureMax: province.agricultureMax,
    commerce: province.commerce,
    commerceMax: province.commerceMax,
    defense: province.defense,
    defenseMax: province.defenseMax,
    loyalty: province.loyalty,
    population: province.population,
    populationMax: province.populationMax,
    tech: province.tech,
  }

  const commandId = queued.commandId
  const payload = parseCommandPayload(queued.payload)

  if (commandId === 'idou') {
    if (!payload || payload.kind !== 'move') {
      return { ok: false, reason: '移動先が指定されていません' }
    }
    const fromMaster = getProvinceMaster(character.provinceId)
    const toMaster = getProvinceMaster(payload.provinceId)
    if (!fromMaster || !toMaster) {
      return { ok: false, reason: '移動先が不正です' }
    }
    if (!areAdjacent(fromMaster, toMaster)) {
      return { ok: false, reason: `${toMaster.name}へは隣接していません` }
    }
    const dest = await provinces.findById(payload.provinceId)
    if (!dest) return { ok: false, reason: '移動先がありません' }

    gainTosoEx(personal)
    if (character.houseId) personal.merit += MOVE_CONTRIBUTION
    personal.defending = 0

    const now = nowSeconds()
    const characters = new CharacterRepository(db)
    await characters.updateProvince(character.id, dest.id, now)
    await characters.updateResources(character.id, {
      merit: personal.merit,
      toso: personal.toso,
      tosoEx: personal.tosoEx,
      defending: 0,
      updatedAt: now,
    })
    await consumeQueuedCommand(db, character.id, queued)
    return { ok: true, message: `${dest.name}へ移動した。` }
  }

  if (commandId === 'beibai') {
    if (!payload || payload.kind !== 'trade') {
      return { ok: false, reason: '売買内容がありません' }
    }
    const amount = Math.min(TRADE_MAX, Math.max(0, Math.floor(payload.amount)))
    const rate = payload.marketRate
    if (payload.side === 'sell_rice') {
      if (personal.rice < amount) return { ok: false, reason: '米が足りません' }
      const gained = Math.floor(amount * rate)
      personal.rice -= amount
      personal.money += gained
      gainChiryakuEx(personal)
      const now = nowSeconds()
      await new CharacterRepository(db).updateResources(character.id, {
        ...personal,
        updatedAt: now,
      })
      await consumeQueuedCommand(db, character.id, queued)
      return { ok: true, message: `米${amount}を売って金${gained}を得た。` }
    }
    if (personal.money < amount) return { ok: false, reason: '金が足りません' }
    const gained = Math.floor(amount * (2 - rate))
    personal.money -= amount
    personal.rice += gained
    gainChiryakuEx(personal)
    const now = nowSeconds()
    await new CharacterRepository(db).updateResources(character.id, {
      ...personal,
      updatedAt: now,
    })
    await consumeQueuedCommand(db, character.id, queued)
    return { ok: true, message: `金${amount}を払って米${gained}を買った。` }
  }

  if (commandId === 'shikan') {
    if (character.houseId) {
      return { ok: false, reason: '無所属でなければ仕官できません' }
    }
    if (!province.houseId) {
      return { ok: false, reason: '中立国には仕官できません' }
    }
    const houses = new HouseRepository(db)
    const house = await houses.findById(province.houseId)
    if (!house || house.destroyedAt) {
      return { ok: false, reason: '仕官先の家がありません' }
    }
    const now = nowSeconds()
    await new CharacterRepository(db).assignHouse(character.id, house.id, now)
    await new HouseRoleRepository(db).create({
      id: createId(16),
      houseId: house.id,
      characterId: character.id,
      role: HOUSE_ROLES.retainer,
      createdAt: now,
    })
    await consumeQueuedCommand(db, character.id, queued)
    return { ok: true, message: `${house.name}へ仕官した。` }
  }

  if (
    commandId === 'nougyou' ||
    commandId === 'syougyou' ||
    commandId === 'shiro' ||
    commandId === 'gijutsu'
  ) {
    if (personal.money < DOMESTIC_GOLD_COST) {
      return { ok: false, reason: '金が足りません' }
    }
    personal.money -= DOMESTIC_GOLD_COST
    const gain = netStatGain(personal.chiryaku)
    personal.merit += COMMAND_CONTRIBUTION
    gainChiryakuEx(personal)

    let message = ''
    if (commandId === 'nougyou') {
      local.agriculture = clamp(local.agriculture + gain, 0, local.agricultureMax)
      message = `${province.name}の農業を+${gain}開発した。`
    } else if (commandId === 'syougyou') {
      local.commerce = clamp(local.commerce + gain, 0, local.commerceMax)
      message = `${province.name}の商業を+${gain}発展させた。`
    } else if (commandId === 'shiro') {
      local.defense = clamp(local.defense + gain, 0, local.defenseMax)
      message = `${province.name}の城壁を+${gain}強化した。`
    } else {
      local.tech = clamp(local.tech + gain, 0, TECH_MAX)
      message = `${province.name}の技術を+${gain}進めた。`
    }

    await finishCommand(db, character, queued, personal, local)
    return { ok: true, message }
  }

  if (commandId === 'komehodokoshi') {
    if (personal.rice < RICE_GIVE_COST) {
      return { ok: false, reason: '米が足りません' }
    }
    personal.rice -= RICE_GIVE_COST
    const gain = netStatGain(personal.tokubo)
    local.loyalty = clamp(local.loyalty + gain, 0, 100)
    personal.merit += COMMAND_CONTRIBUTION
    gainTokuboEx(personal)
    await finishCommand(db, character, queued, personal, local)
    return { ok: true, message: `${province.name}の民忠が+${gain}上がった。` }
  }

  if (commandId === 'chouhei') {
    if (!payload || payload.kind !== 'recruit') {
      return { ok: false, reason: '徴兵人数がありません' }
    }
    const amount = Math.floor(payload.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, reason: '徴兵する人数を入力してください' }
    }
    const room = Math.max(0, personal.toso - personal.troops)
    if (amount > room) {
      return { ok: false, reason: `統率の上限（あと${room}人）を超えます` }
    }
    const goldCost = amount * RECRUIT_GOLD_PER
    const popCost = amount * RECRUIT_POP_PER
    const loyaltyCost = Math.floor(amount / 10)
    if (personal.money < goldCost) return { ok: false, reason: '金が足りません' }
    if (local.population < popCost) return { ok: false, reason: '農民が足りません' }
    if (local.loyalty < loyaltyCost) return { ok: false, reason: '民忠が足りません' }

    personal.money -= goldCost
    personal.troops += amount
    personal.training = Math.max(0, personal.training - amount)
    personal.merit += RECRUIT_CONTRIBUTION
    local.population -= popCost
    local.loyalty = Math.max(0, local.loyalty - loyaltyCost)
    gainBuyuEx(personal)

    await finishCommand(db, character, queued, personal, local)
    return {
      ok: true,
      message: `雑兵を${amount}人徴兵した（金-${goldCost}、農民-${popCost}、民忠-${loyaltyCost}）。`,
    }
  }

  if (commandId === 'kunren') {
    const gain = netTrainGain(personal.toso)
    personal.training = clamp(personal.training + gain, 0, TRAINING_MAX)
    personal.merit += TRAIN_CONTRIBUTION
    gainTosoEx(personal)
    const now = nowSeconds()
    await new CharacterRepository(db).updateResources(character.id, {
      ...personal,
      updatedAt: now,
    })
    await consumeQueuedCommand(db, character.id, queued)
    return { ok: true, message: `訓練度が+${gain}上がった（現在${personal.training}）。` }
  }

  if (commandId === 'shubi') {
    if (personal.troops <= 0) {
      return { ok: false, reason: '兵がいません' }
    }
    const now = nowSeconds()
    const characters = new CharacterRepository(db)
    await characters.clearDefendingInProvince(character.provinceId, character.id, now)
    personal.defending = 1
    personal.merit += DEFEND_CONTRIBUTION
    gainTosoEx(personal)
    await characters.updateResources(character.id, {
      ...personal,
      updatedAt: now,
    })
    await consumeQueuedCommand(db, character.id, queued)
    return { ok: true, message: `${province.name}の守備についた。` }
  }

  if (commandId === 'sensou') {
    if (!payload || payload.kind !== 'war') {
      return { ok: false, reason: '攻撃先が指定されていません' }
    }
    if (!character.houseId) {
      return { ok: false, reason: '無所属では戦争できません' }
    }
    if (personal.troops <= 0) {
      return { ok: false, reason: '兵がいません' }
    }

    const fromMaster = getProvinceMaster(character.provinceId)
    const toMaster = getProvinceMaster(payload.provinceId)
    if (!fromMaster || !toMaster) {
      return { ok: false, reason: '攻撃先が不正です' }
    }
    if (!areAdjacent(fromMaster, toMaster)) {
      return { ok: false, reason: `${toMaster.name}へは隣接していません` }
    }

    const target = await provinces.findById(payload.provinceId)
    if (!target) return { ok: false, reason: '攻撃先がありません' }
    if (target.houseId === character.houseId) {
      return { ok: false, reason: '自国を攻撃できません' }
    }

    const gameState = await new GameStateRepository(db).get()
    const houses = new HouseRepository(db)
    const attackerHouse = await houses.findById(character.houseId)
    if (!attackerHouse) return { ok: false, reason: '所属の家がありません' }
    if (!isHouseWarReady(gameState.turnIndex, attackerHouse.foundedTurn)) {
      return { ok: false, reason: '建国から36ヶ月経過するまで戦争できません' }
    }
    if (target.houseId) {
      const defenderHouse = await houses.findById(target.houseId)
      if (defenderHouse && !isHouseWarReady(gameState.turnIndex, defenderHouse.foundedTurn)) {
        return { ok: false, reason: '相手の家はまだ戦争解禁前です' }
      }
    }

    const characters = new CharacterRepository(db)
    const defenderChar =
      target.houseId != null
        ? await characters.findDefender(target.id, target.houseId)
        : null

    const attackerSide = {
      troops: personal.troops,
      buyu: personal.buyu,
      training: personal.training,
    }
    const defenderSide = defenderChar
      ? {
          troops: defenderChar.troops,
          buyu: defenderChar.buyu,
          training: defenderChar.training,
        }
      : wallDefender(target.defense)

    const battle = resolveBattle(attackerSide, defenderSide)
    const now = nowSeconds()

    personal.troops = battle.attackerTroops
    personal.merit += WAR_CONTRIBUTION
    gainBuyuEx(personal)

    if (battle.winner === 'attacker') {
      if (defenderChar) {
        await characters.updateResources(defenderChar.id, {
          troops: 0,
          defending: 0,
          updatedAt: now,
        })
      } else {
        await provinces.updateStats(target.id, { defense: 0, updatedAt: now })
      }
      await provinces.updateOwner(target.id, character.houseId, now)
      await characters.clearDefendingInProvince(target.id, null, now)

      await characters.updateResources(character.id, {
        ...personal,
        updatedAt: now,
      })
      await consumeQueuedCommand(db, character.id, queued)

      const vsLabel = defenderChar ? `${defenderChar.name}` : `${target.name}の城壁`
      const newsMessage = `${character.name}が${target.name}を攻略した（対${vsLabel}）。`
      await recordWorldEvent(db, {
        year: gameState.year,
        month: gameState.month,
        channel: 'news',
        kind: 'war',
        message: newsMessage,
        provinceId: target.id,
        characterId: character.id,
        houseId: character.houseId,
        createdAt: now,
      })
      return {
        ok: true,
        message: `${target.name}を占領した（残兵${personal.troops}）。`,
      }
    }

    if (defenderChar) {
      await characters.updateResources(defenderChar.id, {
        troops: battle.defenderTroops,
        updatedAt: now,
      })
    } else {
      await provinces.updateStats(target.id, {
        defense: battle.defenderTroops,
        updatedAt: now,
      })
    }

    await characters.updateResources(character.id, {
      ...personal,
      updatedAt: now,
    })
    await consumeQueuedCommand(db, character.id, queued)

    await recordWorldEvent(db, {
      year: gameState.year,
      month: gameState.month,
      channel: 'news',
      kind: 'war',
      message: `${character.name}が${target.name}への侵攻に失敗した。`,
      provinceId: target.id,
      characterId: character.id,
      houseId: character.houseId,
      createdAt: now,
    })
    return {
      ok: true,
      message: `${target.name}への侵攻に失敗した（残兵${personal.troops}）。`,
    }
  }

  if (commandId === 'tanren') {
    if (!payload || payload.kind !== 'train_stat') {
      return { ok: false, reason: '鍛錬する能力が指定されていません' }
    }
    if (personal.money < TRAIN_STAT_GOLD_COST) {
      return { ok: false, reason: '金が足りません' }
    }
    personal.money -= TRAIN_STAT_GOLD_COST
    personal.merit += TRAIN_STAT_CONTRIBUTION
    const statLabel =
      payload.stat === 'buyu' ? '武勇' : payload.stat === 'chiryaku' ? '知略' : '統率'
    if (payload.stat === 'buyu') {
      for (let i = 0; i < TRAIN_STAT_EX_GAIN; i += 1) gainBuyuEx(personal)
    } else if (payload.stat === 'chiryaku') {
      for (let i = 0; i < TRAIN_STAT_EX_GAIN; i += 1) gainChiryakuEx(personal)
    } else {
      for (let i = 0; i < TRAIN_STAT_EX_GAIN; i += 1) gainTosoEx(personal)
    }
    const now = nowSeconds()
    await new CharacterRepository(db).updateResources(character.id, {
      ...personal,
      updatedAt: now,
    })
    await consumeQueuedCommand(db, character.id, queued)
    return { ok: true, message: `${statLabel}を鍛錬した（EX+${TRAIN_STAT_EX_GAIN}）。` }
  }

  if (commandId === 'touyou') {
    if (!payload || payload.kind !== 'recruit_officer') {
      return { ok: false, reason: '登用先が指定されていません' }
    }
    if (!character.houseId) {
      return { ok: false, reason: '無所属では登用できません' }
    }
    if (personal.money < RECRUIT_OFFICER_GOLD_COST) {
      return { ok: false, reason: '金が足りません' }
    }

    const characters = new CharacterRepository(db)
    const target = await characters.findById(payload.targetCharacterId)
    if (!target) return { ok: false, reason: '登用先の武将がいません' }
    if (target.id === character.id) {
      return { ok: false, reason: '自分は登用できません' }
    }
    if (target.provinceId !== character.provinceId) {
      return { ok: false, reason: '同じ国にいる武将のみ登用できます' }
    }
    if (target.houseId && target.houseId === character.houseId) {
      return { ok: false, reason: '同家の武将は登用できません' }
    }
    if (target.houseId) {
      const oldHouse = await new HouseRepository(db).findById(target.houseId)
      if (oldHouse && oldHouse.leaderCharacterId === target.id) {
        return { ok: false, reason: '当主は登用できません' }
      }
    }

    personal.money -= RECRUIT_OFFICER_GOLD_COST
    const now = nowSeconds()
    const gameState = await new GameStateRepository(db).get()
    const success = recruitOfficerSucceeds({
      merit: target.merit,
      loyalty: target.loyalty,
    })

    if (!success) {
      await characters.updateResources(character.id, {
        money: personal.money,
        updatedAt: now,
      })
      await consumeQueuedCommand(db, character.id, queued)
      return { ok: true, message: `${target.name}の登用に失敗した。` }
    }

    // 成功: 家へ引き抜き
    const roles = new HouseRoleRepository(db)
    if (target.houseId) {
      await roles.deleteByCharacterId(target.id)
    }
    const targetUnit = await new UnitRepository(db).findByMember(target.id)
    if (targetUnit) {
      if (targetUnit.leaderCharacterId === target.id) {
        await new UnitRepository(db).delete(targetUnit.id)
      } else {
        await new UnitRepository(db).removeMember(target.id)
      }
    }
    await characters.assignHouse(target.id, character.houseId, now)
    await characters.updateResources(target.id, {
      defending: 0,
      loyalty: 100,
      updatedAt: now,
    })
    await roles.create({
      id: createId(16),
      houseId: character.houseId,
      characterId: target.id,
      role: HOUSE_ROLES.retainer,
      createdAt: now,
    })

    const attackerHouse = await new HouseRepository(db).findById(character.houseId)
    await characters.updateResources(character.id, {
      money: personal.money,
      updatedAt: now,
    })
    await consumeQueuedCommand(db, character.id, queued)
    await recordWorldEvent(db, {
      year: gameState.year,
      month: gameState.month,
      channel: 'news',
      kind: 'social',
      message: `${character.name}が${target.name}を${attackerHouse?.name ?? '自軍'}へ登用した。`,
      provinceId: character.provinceId,
      characterId: character.id,
      houseId: character.houseId,
      createdAt: now,
    })
    return { ok: true, message: `${target.name}を登用した。` }
  }

  if (commandId === 'syuugou') {
    const units = new UnitRepository(db)
    const unit = await units.findByLeader(character.id)
    if (!unit) {
      return { ok: false, reason: '部隊長でなければ集合できません' }
    }
    const memberIds = await units.listMemberIds(unit.id)
    const characters = new CharacterRepository(db)
    const now = nowSeconds()
    let moved = 0
    for (const memberId of memberIds) {
      if (memberId === character.id) continue
      const member = await characters.findById(memberId)
      if (!member) continue
      if (member.provinceId === character.provinceId) continue
      await characters.updateProvince(member.id, character.provinceId, now)
      await characters.updateResources(member.id, { defending: 0, updatedAt: now })
      moved += 1
    }
    await consumeQueuedCommand(db, character.id, queued)
    return {
      ok: true,
      message:
        moved > 0
          ? `部隊「${unit.name}」を${province.name}へ集めた（${moved}人）。`
          : `部隊「${unit.name}」はすでに集まっている。`,
    }
  }

  if (commandId === 'nashi') {
    await consumeQueuedCommand(db, character.id, queued)
    return { ok: true, message: '何もしなかった。' }
  }

  return { ok: false, reason: '未対応のコマンド' }
}

/** 1月・7月の相場変動 */
export function nextMarketRate(current: number): number {
  const delta = Math.round(Math.random() * 50) / 100
  const next = Math.random() < 0.5 ? current + delta : current - delta
  return clamp(Math.round(next * 100) / 100, MARKET_RATE_MIN, MARKET_RATE_MAX)
}

/** 家の給与・俸禄プール（NET SALARY） */
export function houseIncomePool(owned: Province[], kind: 'tax' | 'tribute'): number {
  let ksal = 0
  for (const p of owned) {
    if (kind === 'tax') {
      ksal += Math.floor((p.commerce * 8 * p.population) / 10000)
    } else {
      ksal += Math.floor((p.agriculture * 8 * p.population) / 10000)
    }
  }
  return ksal
}

/** 個人取り分（貢献按分） */
export function characterIncomeShare(
  pool: number,
  merit: number,
  houseMeritTotal: number,
  classPoints: number,
): number {
  if (houseMeritTotal <= 0 || merit <= 0) return 0
  let kadd = Math.floor((pool * merit) / houseMeritTotal + merit * 1.3)
  const sNum = Math.min(SALARY_RANK_MAX, Math.floor(classPoints / CLASS_PER_RANK))
  const cap = SALARY_BASE_CAP + sNum * SALARY_CAP_PER_RANK
  if (kadd > cap) kadd = cap
  return Math.max(0, kadd)
}

/** UI / 単国プレビュー用（所属なし想定の簡易） */
export function previewTaxAmount(province: Province): number {
  return houseIncomePool([province], 'tax')
}

export function previewTributeAmount(province: Province): number {
  return houseIncomePool([province], 'tribute')
}

/** 民忠による人口増減（1月・7月） */
export function applyLoyaltyPopulationDelta(province: Province): number {
  if (province.loyalty >= 50) {
    let add = Math.floor(80 * (province.loyalty - 50))
    if (add < 500) add = 500
    return clamp(province.population + add, 0, province.populationMax) - province.population
  }
  const loss = Math.floor(80 * (50 - province.loyalty))
  return clamp(province.population - loss, 0, province.populationMax) - province.population
}
