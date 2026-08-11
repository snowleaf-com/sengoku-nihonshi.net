import type { Character } from '../types'

type CharacterRow = {
  id: string
  user_id: string
  name: string
  icon_id: string
  created_at: number
  updated_at: number
}

function mapCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    iconId: row.icon_id,
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
    createdAt: number
  }): Promise<Character> {
    await this.db
      .prepare(
        `INSERT INTO characters (id, user_id, name, icon_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(input.id, input.userId, input.name, input.iconId, input.createdAt, input.createdAt)
      .run()

    return {
      id: input.id,
      userId: input.userId,
      name: input.name,
      iconId: input.iconId,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    }
  }

  async findByUserId(userId: string): Promise<Character | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_id, name, icon_id, created_at, updated_at
         FROM characters WHERE user_id = ?`,
      )
      .bind(userId)
      .first<CharacterRow>()

    return row ? mapCharacter(row) : null
  }

  async findById(id: string): Promise<Character | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_id, name, icon_id, created_at, updated_at
         FROM characters WHERE id = ?`,
      )
      .bind(id)
      .first<CharacterRow>()

    return row ? mapCharacter(row) : null
  }
}
