import { createId, nowSeconds } from '../lib/id'
import { CharacterRepository } from '../repositories/characters'
import {
  HouseMessageRepository,
  type HouseMessageWithAuthor,
} from '../repositories/house-messages'
import { HouseRepository } from '../repositories/houses'
import {
  PersonalLetterRepository,
  type InboxLetter,
} from '../repositories/personal-letters'
import type { Character, House, RankingRow } from '../types'
import { DomainError } from './character'

export const SOCIAL_BODY_MIN = 1
export const SOCIAL_BODY_MAX = 200
export const HOUSE_LAW_MAX = 2000
export const HOUSE_MESSAGE_LIMIT = 50
export const LETTER_INBOX_LIMIT = 50

export function validateSocialBody(raw: string): string {
  const body = raw.trim()
  if (body.length < SOCIAL_BODY_MIN || body.length > SOCIAL_BODY_MAX) {
    throw new DomainError(
      `本文は${SOCIAL_BODY_MIN}〜${SOCIAL_BODY_MAX}文字で入力してください`,
    )
  }
  return body
}

export function validateHouseLaw(raw: string): string {
  const text = raw.trim()
  if (text.length > HOUSE_LAW_MAX) {
    throw new DomainError(`国法は${HOUSE_LAW_MAX}文字以内で入力してください`)
  }
  return text
}

async function requireCharacter(db: D1Database, userId: string): Promise<Character> {
  const character = await new CharacterRepository(db).findByUserId(userId)
  if (!character) throw new DomainError('先に武将を作成してください')
  return character
}

async function requireHouseMember(
  db: D1Database,
  userId: string,
): Promise<{ character: Character; house: House }> {
  const character = await requireCharacter(db, userId)
  if (!character.houseId) throw new DomainError('家に所属していません')

  const house = await new HouseRepository(db).findById(character.houseId)
  if (!house || house.destroyedAt) throw new DomainError('所属する家が見つかりません')

  return { character, house }
}

export async function postHouseMessage(
  db: D1Database,
  input: { userId: string; body: string },
): Promise<HouseMessageWithAuthor> {
  const { character, house } = await requireHouseMember(db, input.userId)
  const body = validateSocialBody(input.body)
  const now = nowSeconds()
  const message = await new HouseMessageRepository(db).create({
    id: createId(16),
    houseId: house.id,
    characterId: character.id,
    body,
    createdAt: now,
  })
  return { ...message, authorName: character.name }
}

export async function listHouseMessages(
  db: D1Database,
  input: { userId: string; limit?: number },
): Promise<{ house: House; character: Character; messages: HouseMessageWithAuthor[] }> {
  const { character, house } = await requireHouseMember(db, input.userId)
  const messages = await new HouseMessageRepository(db).listByHouse(
    house.id,
    input.limit ?? HOUSE_MESSAGE_LIMIT,
  )
  return { house, character, messages }
}

export async function updateHouseLaw(
  db: D1Database,
  input: { userId: string; lawText: string },
): Promise<House> {
  const { character, house } = await requireHouseMember(db, input.userId)
  if (house.leaderCharacterId !== character.id) {
    throw new DomainError('国法を編集できるのは当主のみです')
  }
  const lawText = validateHouseLaw(input.lawText)
  await new HouseRepository(db).updateLawText(house.id, lawText)
  return { ...house, lawText }
}

export async function sendLetter(
  db: D1Database,
  input: {
    userId: string
    body: string
    toCharacterId?: string
    toName?: string
  },
): Promise<InboxLetter> {
  const from = await requireCharacter(db, input.userId)
  const body = validateSocialBody(input.body)
  const characters = new CharacterRepository(db)

  let to: Character | null = null
  if (input.toCharacterId) {
    to = await characters.findById(input.toCharacterId)
  } else if (input.toName?.trim()) {
    to = await characters.findByName(input.toName.trim())
  }
  if (!to) throw new DomainError('宛先の武将が見つかりません')
  if (to.id === from.id) throw new DomainError('自分宛には送れません')

  const now = nowSeconds()
  const letter = await new PersonalLetterRepository(db).create({
    id: createId(16),
    fromCharacterId: from.id,
    toCharacterId: to.id,
    body,
    createdAt: now,
  })
  return { ...letter, fromName: from.name }
}

export async function listInbox(
  db: D1Database,
  input: { userId: string; limit?: number },
): Promise<{ character: Character; letters: InboxLetter[] }> {
  const character = await requireCharacter(db, input.userId)
  const letters = await new PersonalLetterRepository(db).listInbox(
    character.id,
    input.limit ?? LETTER_INBOX_LIMIT,
  )
  return { character, letters }
}

export async function listRanking(db: D1Database): Promise<RankingRow[]> {
  const result = await db
    .prepare(
      `SELECT c.id AS character_id, c.name, h.name AS house_name,
              c.buyu, c.chiryaku, c.toso, c.tokubo,
              c.merit, c.class_points, c.rank
       FROM characters c
       LEFT JOIN houses h ON h.id = c.house_id AND h.destroyed_at IS NULL
       ORDER BY c.merit DESC, c.class_points DESC, c.name ASC`,
    )
    .all<{
      character_id: string
      name: string
      house_name: string | null
      buyu: number
      chiryaku: number
      toso: number
      tokubo: number
      merit: number
      class_points: number
      rank: number
    }>()

  return (result.results ?? []).map((row) => ({
    characterId: row.character_id,
    name: row.name,
    houseName: row.house_name,
    buyu: row.buyu,
    chiryaku: row.chiryaku,
    toso: row.toso,
    tokubo: row.tokubo,
    merit: row.merit,
    classPoints: row.class_points,
    rank: row.rank,
  }))
}
