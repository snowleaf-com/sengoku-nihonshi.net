export type Unit = {
  id: string
  houseId: string
  name: string
  leaderCharacterId: string
  createdAt: number
}

type UnitRow = {
  id: string
  house_id: string
  name: string
  leader_character_id: string
  created_at: number
}

function mapUnit(row: UnitRow): Unit {
  return {
    id: row.id,
    houseId: row.house_id,
    name: row.name,
    leaderCharacterId: row.leader_character_id,
    createdAt: row.created_at,
  }
}

export class UnitRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    id: string
    houseId: string
    name: string
    leaderCharacterId: string
    createdAt: number
  }): Promise<Unit> {
    await this.db
      .prepare(
        `INSERT INTO units (id, house_id, name, leader_character_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        input.id,
        input.houseId,
        input.name,
        input.leaderCharacterId,
        input.createdAt,
      )
      .run()

    await this.db
      .prepare(`INSERT INTO unit_members (unit_id, character_id) VALUES (?, ?)`)
      .bind(input.id, input.leaderCharacterId)
      .run()

    return {
      id: input.id,
      houseId: input.houseId,
      name: input.name,
      leaderCharacterId: input.leaderCharacterId,
      createdAt: input.createdAt,
    }
  }

  async findById(id: string): Promise<Unit | null> {
    const row = await this.db
      .prepare(
        `SELECT id, house_id, name, leader_character_id, created_at FROM units WHERE id = ?`,
      )
      .bind(id)
      .first<UnitRow>()
    return row ? mapUnit(row) : null
  }

  async findByLeader(characterId: string): Promise<Unit | null> {
    const row = await this.db
      .prepare(
        `SELECT id, house_id, name, leader_character_id, created_at
         FROM units WHERE leader_character_id = ?`,
      )
      .bind(characterId)
      .first<UnitRow>()
    return row ? mapUnit(row) : null
  }

  async findByMember(characterId: string): Promise<Unit | null> {
    const row = await this.db
      .prepare(
        `SELECT u.id, u.house_id, u.name, u.leader_character_id, u.created_at
         FROM unit_members m
         JOIN units u ON u.id = m.unit_id
         WHERE m.character_id = ?`,
      )
      .bind(characterId)
      .first<UnitRow>()
    return row ? mapUnit(row) : null
  }

  async listByHouse(houseId: string): Promise<Unit[]> {
    const result = await this.db
      .prepare(
        `SELECT id, house_id, name, leader_character_id, created_at
         FROM units WHERE house_id = ?`,
      )
      .bind(houseId)
      .all<UnitRow>()
    return (result.results ?? []).map(mapUnit)
  }

  async listMemberIds(unitId: string): Promise<string[]> {
    const result = await this.db
      .prepare(`SELECT character_id FROM unit_members WHERE unit_id = ?`)
      .bind(unitId)
      .all<{ character_id: string }>()
    return (result.results ?? []).map((r) => r.character_id)
  }

  async addMember(unitId: string, characterId: string): Promise<void> {
    await this.db
      .prepare(`INSERT INTO unit_members (unit_id, character_id) VALUES (?, ?)`)
      .bind(unitId, characterId)
      .run()
  }

  async removeMember(characterId: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM unit_members WHERE character_id = ?`)
      .bind(characterId)
      .run()
  }

  async delete(unitId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM unit_members WHERE unit_id = ?`).bind(unitId).run()
    await this.db.prepare(`DELETE FROM units WHERE id = ?`).bind(unitId).run()
  }
}
