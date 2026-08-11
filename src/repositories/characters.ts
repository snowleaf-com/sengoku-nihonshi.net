import type { Character } from '../types'

type CharacterRow = {
  id: string
  user_id: string
  name: string
  icon_id: string
  archetype_id: string
  buyu: number
  chiryaku: number
  toso: number
  tokubo: number
  house_id: string | null
  province_id: string
  rank: number
  merit: number
  money: number
  troops: number
  created_at: number
  updated_at: number
}

const CHARACTER_COLUMNS = `id, user_id, name, icon_id, archetype_id, buyu, chiryaku, toso, tokubo,
  house_id, province_id, rank, merit, money, troops, created_at, updated_at`

function mapCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    iconId: row.icon_id,
    archetypeId: row.archetype_id,
    buyu: row.buyu,
    chiryaku: row.chiryaku,
    toso: row.toso,
    tokubo: row.tokubo,
    houseId: row.house_id,
    provinceId: row.province_id,
    rank: row.rank,
    merit: row.merit,
    money: row.money,
    troops: row.troops,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CharacterRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    id: string
    userId: string
    name: string
    iconId: string
    archetypeId: string
    buyu: number
    chiryaku: number
    toso: number
    tokubo: number
    provinceId: string
    rank: number
    merit: number
    money: number
    troops: number
    createdAt: number
  }): Promise<Character> {
    await this.db
      .prepare(
        `INSERT INTO characters (
           id, user_id, name, icon_id, archetype_id, buyu, chiryaku, toso, tokubo,
           house_id, province_id, rank, merit, money, troops, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.id,
        input.userId,
        input.name,
        input.iconId,
        input.archetypeId,
        input.buyu,
        input.chiryaku,
        input.toso,
        input.tokubo,
        input.provinceId,
        input.rank,
        input.merit,
        input.money,
        input.troops,
        input.createdAt,
        input.createdAt,
      )
      .run()

    return {
      id: input.id,
      userId: input.userId,
      name: input.name,
      iconId: input.iconId,
      archetypeId: input.archetypeId,
      buyu: input.buyu,
      chiryaku: input.chiryaku,
      toso: input.toso,
      tokubo: input.tokubo,
      houseId: null,
      provinceId: input.provinceId,
      rank: input.rank,
      merit: input.merit,
      money: input.money,
      troops: input.troops,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    }
  }

  async findByUserId(userId: string): Promise<Character | null> {
    const row = await this.db
      .prepare(`SELECT ${CHARACTER_COLUMNS} FROM characters WHERE user_id = ?`)
      .bind(userId)
      .first<CharacterRow>()
    return row ? mapCharacter(row) : null
  }

  async findById(id: string): Promise<Character | null> {
    const row = await this.db
      .prepare(`SELECT ${CHARACTER_COLUMNS} FROM characters WHERE id = ?`)
      .bind(id)
      .first<CharacterRow>()
    return row ? mapCharacter(row) : null
  }

  async findByName(name: string): Promise<Character | null> {
    const row = await this.db
      .prepare(`SELECT ${CHARACTER_COLUMNS} FROM characters WHERE name = ?`)
      .bind(name)
      .first<CharacterRow>()
    return row ? mapCharacter(row) : null
  }

  async assignHouse(characterId: string, houseId: string, updatedAt: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE characters
         SET house_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(houseId, updatedAt, characterId)
      .run()
  }
}
