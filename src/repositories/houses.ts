import type { House } from '../types'

type HouseRow = {
  id: string
  name: string
  leader_character_id: string | null
  color: string
  created_at: number
  destroyed_at: number | null
}

function mapHouse(row: HouseRow): House {
  return {
    id: row.id,
    name: row.name,
    leaderCharacterId: row.leader_character_id,
    color: row.color,
    createdAt: row.created_at,
    destroyedAt: row.destroyed_at,
  }
}

export class HouseRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    id: string
    name: string
    leaderCharacterId: string
    color: string
    createdAt: number
  }): Promise<House> {
    await this.db
      .prepare(
        `INSERT INTO houses (id, name, leader_character_id, color, created_at, destroyed_at)
         VALUES (?, ?, ?, ?, ?, NULL)`,
      )
      .bind(input.id, input.name, input.leaderCharacterId, input.color, input.createdAt)
      .run()

    return {
      id: input.id,
      name: input.name,
      leaderCharacterId: input.leaderCharacterId,
      color: input.color,
      createdAt: input.createdAt,
      destroyedAt: null,
    }
  }

  async findById(id: string): Promise<House | null> {
    const row = await this.db
      .prepare(
        `SELECT id, name, leader_character_id, color, created_at, destroyed_at
         FROM houses WHERE id = ?`,
      )
      .bind(id)
      .first<HouseRow>()
    return row ? mapHouse(row) : null
  }

  async findByName(name: string): Promise<House | null> {
    const row = await this.db
      .prepare(
        `SELECT id, name, leader_character_id, color, created_at, destroyed_at
         FROM houses WHERE name = ? AND destroyed_at IS NULL`,
      )
      .bind(name)
      .first<HouseRow>()
    return row ? mapHouse(row) : null
  }

  async listActive(): Promise<House[]> {
    const result = await this.db
      .prepare(
        `SELECT id, name, leader_character_id, color, created_at, destroyed_at
         FROM houses WHERE destroyed_at IS NULL`,
      )
      .all<HouseRow>()
    return (result.results ?? []).map(mapHouse)
  }
}
