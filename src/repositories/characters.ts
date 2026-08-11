import type { Character } from '../types'

type CharacterRow = {
  id: string
  user_id: string
  name: string
  house_id: string | null
  province_id: string
  rank: number
  merit: number
  money: number
  troops: number
  created_at: number
  updated_at: number
}

function mapCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
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
           id, user_id, name, house_id, province_id, rank, merit, money, troops, created_at, updated_at
         ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.id,
        input.userId,
        input.name,
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
      .prepare(
        `SELECT id, user_id, name, house_id, province_id, rank, merit, money, troops, created_at, updated_at
         FROM characters WHERE user_id = ?`,
      )
      .bind(userId)
      .first<CharacterRow>()
    return row ? mapCharacter(row) : null
  }

  async findById(id: string): Promise<Character | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_id, name, house_id, province_id, rank, merit, money, troops, created_at, updated_at
         FROM characters WHERE id = ?`,
      )
      .bind(id)
      .first<CharacterRow>()
    return row ? mapCharacter(row) : null
  }

  async findByName(name: string): Promise<Character | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_id, name, house_id, province_id, rank, merit, money, troops, created_at, updated_at
         FROM characters WHERE name = ?`,
      )
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
