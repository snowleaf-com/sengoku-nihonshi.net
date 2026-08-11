import {
  isArchetypeId,
  parseStatValue,
  resolveCharacterStats,
  type ArchetypeId,
} from '../config/archetypes'
import {
  CHARACTER_NAME_MAX,
  CHARACTER_NAME_MIN,
  STARTING_MONEY,
  STARTING_TROOPS,
} from '../config/game'
import { isCharacterIconId } from '../config/icons'
import { createId, nowSeconds } from '../lib/id'
import { CharacterRepository } from '../repositories/characters'
import { ProvinceRepository } from '../repositories/provinces'
import type { Character } from '../types'
import { ensureProvincesSeeded } from './world'

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export function normalizeCharacterName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function validateCharacterName(name: string): string | null {
  if (name.length < CHARACTER_NAME_MIN || name.length > CHARACTER_NAME_MAX) {
    return `武将名は${CHARACTER_NAME_MIN}〜${CHARACTER_NAME_MAX}文字で入力してください`
  }
  if (/[<>&"'`]/.test(name)) {
    return '武将名に使用できない文字が含まれています'
  }
  return null
}

export async function createCharacter(
  db: D1Database,
  input: {
    userId: string
    name: string
    iconId: string
    archetypeId: string
    buyu?: string
    chiryaku?: string
    toso?: string
    provinceId: string
  },
): Promise<Character> {
  await ensureProvincesSeeded(db)

  const name = normalizeCharacterName(input.name)
  const nameError = validateCharacterName(name)
  if (nameError) throw new DomainError(nameError)

  if (!isCharacterIconId(input.iconId)) {
    throw new DomainError('アイコンを選んでください')
  }

  if (!isArchetypeId(input.archetypeId)) {
    throw new DomainError('立ち回りを選んでください')
  }

  if (!input.provinceId) {
    throw new DomainError('初期位置を選んでください')
  }

  const archetypeId = input.archetypeId as ArchetypeId
  const resolved = resolveCharacterStats(archetypeId, {
    buyu: parseStatValue(input.buyu),
    chiryaku: parseStatValue(input.chiryaku),
    toso: parseStatValue(input.toso),
  })
  if (!resolved.ok) throw new DomainError(resolved.error)

  const characters = new CharacterRepository(db)
  const existing = await characters.findByUserId(input.userId)
  if (existing) throw new DomainError('すでに武将を所持しています')

  const sameName = await characters.findByName(name)
  if (sameName) throw new DomainError('その武将名はすでに使われています')

  const provinces = new ProvinceRepository(db)
  const start = await provinces.findById(input.provinceId)
  if (!start) {
    throw new DomainError('選択した国が見つかりません')
  }

  const now = nowSeconds()
  const { stats } = resolved

  return characters.create({
    id: createId(16),
    userId: input.userId,
    name,
    iconId: input.iconId,
    archetypeId,
    buyu: stats.buyu,
    chiryaku: stats.chiryaku,
    toso: stats.toso,
    tokubo: stats.tokubo,
    provinceId: start.id,
    rank: 1,
    merit: 0,
    money: STARTING_MONEY,
    troops: STARTING_TROOPS,
    createdAt: now,
  })
}
