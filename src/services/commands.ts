import { STAT_MIN } from '../config/archetypes'
import {
  COMMAND_QUEUE_MAX,
  buildCommandSlots,
  getCommand,
  isCommandId,
  parseSlotPositions,
  STAT_EX_PER_LEVEL,
  type CommandEffect,
  type EffectTarget,
} from '../config/commands'
import { createId, nowSeconds } from '../lib/id'
import { CharacterCommandRepository } from '../repositories/character-commands'
import { CharacterRepository } from '../repositories/characters'
import { ProvinceRepository } from '../repositories/provinces'
import type { Character, CharacterCommand, Province } from '../types'
import { DomainError } from './character'

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
function applyStatEx(
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

/** 選択した枠にコマンドを書き込む（空き＝無しの枠も含む） */
export async function applyCommandsToPositions(
  db: D1Database,
  input: { userId: string; commandId: string; positions: Array<number | string> },
): Promise<void> {
  if (!isCommandId(input.commandId)) {
    throw new DomainError('コマンドが不正です')
  }
  const positions = normalizePositions(input.positions)
  if (positions.length === 0) {
    throw new DomainError('入力する予約枠を選んでください')
  }

  const character = await requireOwnedCharacter(db, input.userId)
  const commands = new CharacterCommandRepository(db)
  const queue = await commands.listByCharacter(character.id)
  const byPosition = new Map(queue.map((row) => [row.position, row]))
  const createdAt = nowSeconds()

  const updates: Array<{ id: string; commandId: string }> = []
  const inserts: Array<{
    id: string
    characterId: string
    commandId: string
    position: number
    createdAt: number
  }> = []

  for (const position of positions) {
    const existing = byPosition.get(position)
    if (existing) {
      updates.push({ id: existing.id, commandId: input.commandId })
    } else {
      inserts.push({
        id: createId(16),
        characterId: character.id,
        commandId: input.commandId,
        position,
        createdAt,
      })
    }
  }

  await commands.updateCommandIds(updates)
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
 * 例: 1=開墾 2=市立て を選ぶ → 3以降が 開墾市立て開墾市立て…
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
  // パターンを順に適用するため、positionごとに command を変える
  const byPosition = new Map((await commands.listByCharacter(character.id)).map((row) => [row.position, row]))
  const createdAt = nowSeconds()
  const updates: Array<{ id: string; commandId: string }> = []
  const inserts: Array<{
    id: string
    characterId: string
    commandId: string
    position: number
    createdAt: number
  }> = []

  writePositions.forEach((position, offset) => {
    const commandId = pattern[offset % pattern.length]!
    const existing = byPosition.get(position)
    if (existing) updates.push({ id: existing.id, commandId })
    else {
      inserts.push({
        id: createId(16),
        characterId: character.id,
        commandId,
        position,
        createdAt,
      })
    }
  })

  await commands.updateCommandIds(updates)
  await commands.enqueueMany(inserts)
}

type MutableCharacter = {
  money: number
  rice: number
  troops: number
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
  commerce: number
  loyalty: number
  population: number
}

function applyPersonalEffect(state: MutableCharacter, effect: CommandEffect): string | null {
  const target = effect.target
  if (target === 'money') {
    if (state.money < effect.amount) return '金が足りません'
    state.money -= effect.amount
    return null
  }
  if (target === 'rice') {
    if (state.rice < effect.amount) return '米が足りません'
    state.rice -= effect.amount
    return null
  }
  if (target === 'buyu') {
    const next = applyStatEx(state.buyu, state.buyuEx, effect.amount)
    state.buyu = next.value
    state.buyuEx = next.ex
    return null
  }
  if (target === 'chiryaku') {
    const next = applyStatEx(state.chiryaku, state.chiryakuEx, effect.amount)
    state.chiryaku = next.value
    state.chiryakuEx = next.ex
    return null
  }
  if (target === 'toso') {
    const next = applyStatEx(state.toso, state.tosoEx, effect.amount)
    state.toso = next.value
    state.tosoEx = next.ex
    return null
  }
  if (target === 'tokubo') {
    const next = applyStatEx(state.tokubo, state.tokuboEx, effect.amount)
    state.tokubo = Math.max(STAT_MIN, next.value)
    state.tokuboEx = next.ex
    return null
  }
  return null
}

function applyProvinceEffect(state: MutableProvince, effect: CommandEffect): void {
  if (effect.target === 'agriculture') {
    state.agriculture = clamp(state.agriculture + effect.amount, 0, 9999)
  } else if (effect.target === 'commerce') {
    state.commerce = clamp(state.commerce + effect.amount, 0, 9999)
  } else if (effect.target === 'loyalty') {
    state.loyalty = clamp(state.loyalty + effect.amount, 0, 100)
  } else if (effect.target === 'population') {
    state.population = clamp(state.population + effect.amount, 0, 999999)
  }
}

const PROVINCE_TARGETS: EffectTarget[] = [
  'agriculture',
  'commerce',
  'loyalty',
  'population',
]

export async function executeCharacterCommand(
  db: D1Database,
  character: Character,
  queued: CharacterCommand,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const definition = getCommand(queued.commandId)
  if (!definition) {
    return { ok: false, reason: '不明なコマンド' }
  }

  const provinces = new ProvinceRepository(db)
  const province = await provinces.findById(character.provinceId)
  if (!province) {
    return { ok: false, reason: '所在国がありません' }
  }

  const personal: MutableCharacter = {
    money: character.money,
    rice: character.rice,
    troops: character.troops,
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
    commerce: province.commerce,
    loyalty: province.loyalty,
    population: province.population,
  }

  for (const effect of definition.effects) {
    if (effect.magnitude === 'down' || effect.magnitude === 'down2') {
      const err = applyPersonalEffect(personal, effect)
      if (err) return { ok: false, reason: err }
    }
  }

  for (const effect of definition.effects) {
    if (effect.magnitude === 'up' || effect.magnitude === 'up2') {
      if (PROVINCE_TARGETS.includes(effect.target)) {
        applyProvinceEffect(local, effect)
      } else {
        applyPersonalEffect(personal, effect)
      }
    }
  }

  personal.merit += 5
  const now = nowSeconds()
  const characters = new CharacterRepository(db)
  await characters.updateResources(character.id, { ...personal, updatedAt: now })
  await provinces.updateStats(province.id, { ...local, updatedAt: now })

  const commands = new CharacterCommandRepository(db)
  await commands.delete(queued.id)
  await commands.shiftDownAfter(character.id, queued.position)

  return { ok: true }
}

export function previewTaxAmount(province: Province): number {
  return Math.max(50, Math.floor(province.commerce * 0.4 + province.population * 0.02))
}

export function previewTributeAmount(province: Province): number {
  return Math.max(50, Math.floor(province.agriculture * 0.4 + province.population * 0.02))
}
