import type { Province } from '../types'

type ProvinceRow = {
  id: string
  name: string
  house_id: string | null
  population: number
  agriculture: number
  commerce: number
  defense: number
  garrison: number
  created_at: number
  updated_at: number
}

function mapProvince(row: ProvinceRow): Province {
  return {
    id: row.id,
    name: row.name,
    houseId: row.house_id,
    population: row.population,
    agriculture: row.agriculture,
    commerce: row.commerce,
    defense: row.defense,
    garrison: row.garrison,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ProvinceRepository {
  constructor(private readonly db: D1Database) {}

  async count(): Promise<number> {
    const row = await this.db.prepare(`SELECT COUNT(*) AS c FROM provinces`).first<{ c: number }>()
    return row?.c ?? 0
  }

  async insertMany(
    rows: Array<{
      id: string
      name: string
      population: number
      agriculture: number
      commerce: number
      defense: number
      garrison: number
      createdAt: number
    }>,
  ): Promise<void> {
    if (rows.length === 0) return

    const stmts = rows.map((row) =>
      this.db
        .prepare(
          `INSERT OR IGNORE INTO provinces (
             id, name, house_id, population, agriculture, commerce, defense, garrison, created_at, updated_at
           ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          row.id,
          row.name,
          row.population,
          row.agriculture,
          row.commerce,
          row.defense,
          row.garrison,
          row.createdAt,
          row.createdAt,
        ),
    )
    await this.db.batch(stmts)
  }

  async listAll(): Promise<Province[]> {
    const result = await this.db
      .prepare(
        `SELECT id, name, house_id, population, agriculture, commerce, defense, garrison, created_at, updated_at
         FROM provinces`,
      )
      .all<ProvinceRow>()
    return (result.results ?? []).map(mapProvince)
  }

  async findById(id: string): Promise<Province | null> {
    const row = await this.db
      .prepare(
        `SELECT id, name, house_id, population, agriculture, commerce, defense, garrison, created_at, updated_at
         FROM provinces WHERE id = ?`,
      )
      .bind(id)
      .first<ProvinceRow>()
    return row ? mapProvince(row) : null
  }

  async listNeutral(): Promise<Province[]> {
    const result = await this.db
      .prepare(
        `SELECT id, name, house_id, population, agriculture, commerce, defense, garrison, created_at, updated_at
         FROM provinces WHERE house_id IS NULL`,
      )
      .all<ProvinceRow>()
    return (result.results ?? []).map(mapProvince)
  }

  async updateOwner(provinceId: string, houseId: string, updatedAt: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE provinces
         SET house_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(houseId, updatedAt, provinceId)
      .run()
  }
}
