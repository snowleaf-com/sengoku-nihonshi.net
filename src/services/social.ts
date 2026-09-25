import {
  HOUSE_ROLES,
  UNIQUE_HOUSE_ROLE_IDS,
  isAppointableHouseRoleId,
} from '../config/game'
import { createId, nowSeconds } from '../lib/id'
import { CharacterRepository } from '../repositories/characters'
import {
  HouseMessageRepository,
  type HouseMessageWithAuthor,
} from '../repositories/house-messages'
import { HouseRoleRepository } from '../repositories/house-roles'
import { HouseRepository } from '../repositories/houses'
import { ProvinceRepository } from '../repositories/provinces'
import {
  PersonalLetterRepository,
  type InboxLetter,
} from '../repositories/personal-letters'
import type {
  Character,
  House,
  HouseRankingBlock,
  RankingRow,
  TitleBoard,
  TitleEntry,
} from '../types'
import { DomainError } from './character'
import { recordWorldEvent } from './events'
import { ensureGameState } from './turns'

export const SOCIAL_BODY_MIN = 1
export const SOCIAL_BODY_MAX = 200
export const HOUSE_LAW_MAX = 2000
export const HOUSE_MESSAGE_LIMIT = 50
export const LETTER_INBOX_LIMIT = 50

export type HouseMemberRow = {
  characterId: string
  name: string
  roleLabel: string
  isLord: boolean
}

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

async function listMembersForHouse(
  db: D1Database,
  house: House,
): Promise<HouseMemberRow[]> {
  const [characters, roles] = await Promise.all([
    new CharacterRepository(db).listByHouseId(house.id),
    new HouseRoleRepository(db).listByHouseId(house.id),
  ])
  const roleByChar = Object.fromEntries(roles.map((r) => [r.characterId, r.role]))
  return characters
    .map((c) => ({
      characterId: c.id,
      name: c.name,
      roleLabel:
        c.id === house.leaderCharacterId
          ? HOUSE_ROLES.lord
          : (roleByChar[c.id] ?? HOUSE_ROLES.retainer),
      isLord: c.id === house.leaderCharacterId,
    }))
    .sort((a, b) => {
      if (a.isLord !== b.isLord) return a.isLord ? -1 : 1
      return a.name.localeCompare(b.name, 'ja')
    })
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
): Promise<{
  house: House
  character: Character
  messages: HouseMessageWithAuthor[]
  members: HouseMemberRow[]
}> {
  const { character, house } = await requireHouseMember(db, input.userId)
  const [messages, members] = await Promise.all([
    new HouseMessageRepository(db).listByHouse(
      house.id,
      input.limit ?? HOUSE_MESSAGE_LIMIT,
    ),
    listMembersForHouse(db, house),
  ])
  return { house, character, messages, members }
}

/**
 * 当主が家臣に役職（称号）を付ける。効果はなく表示のみ。
 * 軍師・大将は家に1人まで（前任は家臣へ）。当主自身は変更不可。
 */
export async function appointHouseRole(
  db: D1Database,
  input: { userId: string; targetCharacterId: string; roleId: string },
): Promise<{ targetName: string; roleLabel: string }> {
  const { character, house } = await requireHouseMember(db, input.userId)
  if (house.leaderCharacterId !== character.id) {
    throw new DomainError('任命できるのは当主のみです')
  }
  if (!isAppointableHouseRoleId(input.roleId)) {
    throw new DomainError('その役職には任命できません')
  }

  const characters = new CharacterRepository(db)
  const target = await characters.findById(input.targetCharacterId)
  if (!target || target.houseId !== house.id) {
    throw new DomainError('任命先の武将が見つかりません')
  }
  if (target.id === house.leaderCharacterId) {
    throw new DomainError('当主の役職は変更できません')
  }

  const roleLabel = HOUSE_ROLES[input.roleId]
  const roles = new HouseRoleRepository(db)
  const now = nowSeconds()

  if ((UNIQUE_HOUSE_ROLE_IDS as readonly string[]).includes(input.roleId)) {
    const holders = await roles.listByHouseAndRole(house.id, roleLabel)
    for (const holder of holders) {
      if (holder.characterId === target.id) continue
      await roles.deleteByCharacterId(holder.characterId)
      await roles.create({
        id: createId(16),
        houseId: house.id,
        characterId: holder.characterId,
        role: HOUSE_ROLES.retainer,
        createdAt: now,
      })
    }
  }

  await roles.deleteByCharacterId(target.id)
  await roles.create({
    id: createId(16),
    houseId: house.id,
    characterId: target.id,
    role: roleLabel,
    createdAt: now,
  })

  const gameState = await ensureGameState(db)
  await recordWorldEvent(db, {
    year: gameState.year,
    month: gameState.month,
    channel: 'news',
    kind: 'social',
    message: `${character.name}が${target.name}を${roleLabel}に任命した。`,
    provinceId: character.provinceId,
    characterId: character.id,
    houseId: house.id,
    createdAt: now,
  })

  return { targetName: target.name, roleLabel }
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
      `SELECT c.id AS character_id, c.name, h.name AS house_name, c.house_id AS house_id,
              c.province_id AS province_id, p.name AS province_name, c.troops AS troops,
              hr.role AS role_label,
              c.buyu, c.chiryaku, c.toso, c.tokubo,
              c.merit, c.class_points, c.rank, c.money, c.rice
       FROM characters c
       LEFT JOIN houses h ON h.id = c.house_id AND h.destroyed_at IS NULL
       LEFT JOIN provinces p ON p.id = c.province_id
       LEFT JOIN house_roles hr ON hr.character_id = c.id
       ORDER BY c.merit DESC, c.class_points DESC, c.name ASC`,
    )
    .all<{
      character_id: string
      name: string
      house_name: string | null
      house_id: string | null
      province_id: string
      province_name: string | null
      troops: number
      role_label: string | null
      buyu: number
      chiryaku: number
      toso: number
      tokubo: number
      merit: number
      class_points: number
      rank: number
      money: number
      rice: number
    }>()

  return (result.results ?? []).map((row) => ({
    characterId: row.character_id,
    name: row.name,
    houseName: row.house_name,
    houseId: row.house_id,
    provinceId: row.province_id,
    provinceName: row.province_name ?? row.province_id,
    troops: row.troops,
    roleLabel: row.role_label,
    buyu: row.buyu,
    chiryaku: row.chiryaku,
    toso: row.toso,
    tokubo: row.tokubo,
    merit: row.merit,
    classPoints: row.class_points,
    rank: row.rank,
    money: row.money,
    rice: row.rice,
  }))
}

/** 原本 ranking.cgi: 家（国）ごとに武将をまとめる */
export async function listRankingByHouse(
  db: D1Database,
): Promise<{ houses: HouseRankingBlock[]; ronin: RankingRow[]; total: number }> {
  const [rows, provinces] = await Promise.all([
    listRanking(db),
    new ProvinceRepository(db).listAll(),
  ])

  const ownedByHouse = new Map<string, string[]>()
  for (const p of provinces) {
    if (!p.houseId) continue
    const list = ownedByHouse.get(p.houseId) ?? []
    list.push(p.name)
    ownedByHouse.set(p.houseId, list)
  }

  const byHouse = new Map<string, RankingRow[]>()
  const ronin: RankingRow[] = []
  for (const row of rows) {
    if (!row.houseId || !row.houseName) {
      ronin.push(row)
      continue
    }
    const list = byHouse.get(row.houseId) ?? []
    list.push(row)
    byHouse.set(row.houseId, list)
  }

  const houses: HouseRankingBlock[] = []
  for (const [houseId, members] of byHouse) {
    const houseName = members[0]?.houseName ?? '不明'
    const provinceNames = (ownedByHouse.get(houseId) ?? []).sort((a, b) =>
      a.localeCompare(b, 'ja'),
    )
    const findRole = (label: string) =>
      members.find((m) => m.roleLabel === label)?.name ?? null
    houses.push({
      houseId,
      houseName,
      lordName: findRole(HOUSE_ROLES.lord),
      strategistName: findRole(HOUSE_ROLES.strategist),
      generalName: findRole(HOUSE_ROLES.general),
      memberCount: members.length,
      provinceCount: provinceNames.length,
      provinceNames,
      members,
    })
  }

  houses.sort((a, b) => {
    if (b.provinceCount !== a.provinceCount) return b.provinceCount - a.provinceCount
    if (b.memberCount !== a.memberCount) return b.memberCount - a.memberCount
    return a.houseName.localeCompare(b.houseName, 'ja')
  })

  return { houses, ronin, total: rows.length }
}

const TITLE_LIMIT = 10

function topBy(
  rows: RankingRow[],
  score: (row: RankingRow) => number,
  format: (value: number) => string,
): TitleEntry[] {
  return [...rows]
    .sort((a, b) => {
      const diff = score(b) - score(a)
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name, 'ja')
    })
    .slice(0, TITLE_LIMIT)
    .map((row, i) => {
      const value = score(row)
      return {
        rank: i + 1,
        name: row.name,
        houseName: row.houseName ?? '浪人',
        value,
        valueLabel: format(value),
      }
    })
}

/** 原本 ranking2.cgi: 名称一覧（各指標 Top10） */
export async function listTitleBoards(
  db: D1Database,
): Promise<{ highlight: TitleEntry[]; boards: TitleBoard[] }> {
  const rows = await listRanking(db)
  const boards: TitleBoard[] = [
    {
      id: 'total',
      title: '総合実力',
      entries: topBy(
        rows,
        (r) => r.buyu + r.chiryaku + r.toso,
        (v) => String(v),
      ),
    },
    {
      id: 'buyu',
      title: '武勇',
      entries: topBy(rows, (r) => r.buyu, (v) => String(v)),
    },
    {
      id: 'chiryaku',
      title: '知略',
      entries: topBy(rows, (r) => r.chiryaku, (v) => String(v)),
    },
    {
      id: 'toso',
      title: '統率',
      entries: topBy(rows, (r) => r.toso, (v) => String(v)),
    },
    {
      id: 'tokubo',
      title: '徳望',
      entries: topBy(rows, (r) => r.tokubo, (v) => String(v)),
    },
    {
      id: 'merit',
      title: '貢献',
      entries: topBy(rows, (r) => r.merit, (v) => String(v)),
    },
    {
      id: 'class',
      title: '階級値',
      entries: topBy(rows, (r) => r.classPoints, (v) => String(v)),
    },
    {
      id: 'money',
      title: '金',
      entries: topBy(rows, (r) => r.money, (v) => `${v} 両`),
    },
    {
      id: 'rice',
      title: '米',
      entries: topBy(rows, (r) => r.rice, (v) => `${v} 石`),
    },
  ]

  const highlight = boards
    .map((board) => {
      const top = board.entries[0]
      if (!top) return null
      return { ...top, name: `${board.title} No.1 ${top.name}` }
    })
    .filter((row): row is TitleEntry => row != null)
    .slice(0, 6)

  return { highlight, boards }
}
