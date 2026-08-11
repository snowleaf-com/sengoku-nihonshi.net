import type { HouseRole } from '../types'

type HouseRoleRow = {
  id: string
  house_id: string
  character_id: string
  role: string
  created_at: number
}

function mapHouseRole(row: HouseRoleRow): HouseRole {
  return {
    id: row.id,
    houseId: row.house_id,
    characterId: row.character_id,
    role: row.role,
    createdAt: row.created_at,
  }
}

export class HouseRoleRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    id: string
    houseId: string
    characterId: string
    role: string
    createdAt: number
  }): Promise<HouseRole> {
    await this.db
      .prepare(
        `INSERT INTO house_roles (id, house_id, character_id, role, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(input.id, input.houseId, input.characterId, input.role, input.createdAt)
      .run()

    return {
      id: input.id,
      houseId: input.houseId,
      characterId: input.characterId,
      role: input.role,
      createdAt: input.createdAt,
    }
  }

  async findByCharacterId(characterId: string): Promise<HouseRole | null> {
    const row = await this.db
      .prepare(
        `SELECT id, house_id, character_id, role, created_at
         FROM house_roles WHERE character_id = ?`,
      )
      .bind(characterId)
      .first<HouseRoleRow>()
    return row ? mapHouseRole(row) : null
  }
}
