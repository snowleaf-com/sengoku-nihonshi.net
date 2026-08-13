import { STAT_MIN } from '../config/archetypes'
import {
  COMMAND_QUEUE_MAX,
  getCommand,
  isCommandId,
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

export async function enqueueCommand(
  db: D1Database,
  input: { userId: string; commandId: string },
): Promise<CharacterCommand> {
  if (!isCommandId(input.commandId)) {
    throw new DomainError('コマンドが不正です')
  }

  const characters = new CharacterRepository(db)
  const character = await characters.findByUserId(input.userId)
  if (!character) throw new DomainError('武将が見つかりません')

  const commands = new CharacterCommandRepository(db)
  const count = await commands.countByCharacter(character.id)
  if (count >= COMMAND_QUEUE_MAX) {
    throw new DomainError(`コマンドは最大${COMMAND_QUEUE_MAX}までです`)
  }

  return commands.enqueue({
    id: createId(16),
    characterId: character.id,
    commandId: input.commandId,
    position: count,
    createdAt: nowSeconds(),
  })
}

export async function cancelQueuedCommand(
  db: D1Database,
  input: { userId: string; queueId: string },
): Promise<void> {
  const characters = new CharacterRepository(db)
  const character = await characters.findByUserId(input.userId)
  if (!character) throw new DomainError('武将が見つかりません')

  const commands = new CharacterCommandRepository(db)
  const queue = await commands.listByCharacter(character.id)
  const target = queue.find((row) => row.id === input.queueId)
  if (!target) throw new DomainError('予約コマンドが見つかりません')

  await commands.delete(target.id)
  await commands.resequence(character.id)
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
  await commands.resequence(character.id)

  return { ok: true }
}

export function previewTaxAmount(province: Province): number {
  return Math.max(50, Math.floor(province.commerce * 0.4 + province.population * 0.02))
}

export function previewTributeAmount(province: Province): number {
  return Math.max(50, Math.floor(province.agriculture * 0.4 + province.population * 0.02))
}
