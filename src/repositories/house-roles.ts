import type { HouseRole } from '../types'

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
}
