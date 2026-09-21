import type { Province } from '../types'
import { DEFAULT_MARKET_RATE, POPULATION_MAX } from '../config/net'

type ProvinceRow = {
  id: string
  name: string
  house_id: string | null
  population: number
  population_max: number
  agriculture: number
  agriculture_max: number
  commerce: number
  commerce_max: number
  defense: number
  defense_max: number
  garrison: number
  loyalty: number
  tech: number
  market_rate: number
  created_at: number
  updated_at: number
}

const PROVINCE_COLUMNS = `id, name, house_id, population, population_max,
  agriculture, agriculture_max, commerce, commerce_max,
  defense, defense_max, garrison, loyalty, tech, market_rate,
  created_at, updated_at`

function mapProvince(row: ProvinceRow): Province {
  return {
    id: row.id,
    name: row.name,
    houseId: row.house_id,
    population: row.population,
    populationMax: row.population_max,
    agriculture: row.agriculture,
    agricultureMax: row.agriculture_max,
    commerce: row.commerce,
    commerceMax: row.commerce_max,
    defense: row.defense,
    defenseMax: row.defense_max,
    garrison: row.garrison,
    loyalty: row.loyalty,
    tech: row.tech,
    marketRate: row.market_rate,
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
      populationMax: number
      agriculture: number
      agricultureMax: number
      commerce: number
      commerceMax: number
      defense: number
      defenseMax: number
      garrison: number
      loyalty: number
      tech?: number
      marketRate?: number
      createdAt: number
    }>,
  ): Promise<void> {
    if (rows.length === 0) return

    const stmts = rows.map((row) =>
      this.db
        .prepare(
          `INSERT OR IGNORE INTO provinces (
             id, name, house_id, population, population_max,
             agriculture, agriculture_max, commerce, commerce_max,
             defense, defense_max, garrison, loyalty, tech, market_rate,
             created_at, updated_at
           ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          row.id,
          row.name,
          row.population,
          row.populationMax,
          row.agriculture,
          row.agricultureMax,
          row.commerce,
          row.commerceMax,
          row.defense,
          row.defenseMax,
          row.garrison,
          row.loyalty,
          row.tech ?? 0,
          row.marketRate ?? DEFAULT_MARKET_RATE,
          row.createdAt,
          row.createdAt,
        ),
    )
    await this.db.batch(stmts)
  }

  async listAll(): Promise<Province[]> {
    const result = await this.db
      .prepare(`SELECT ${PROVINCE_COLUMNS} FROM provinces`)
      .all<ProvinceRow>()
    return (result.results ?? []).map(mapProvince)
  }

  async listByHouseId(houseId: string): Promise<Province[]> {
    const result = await this.db
      .prepare(`SELECT ${PROVINCE_COLUMNS} FROM provinces WHERE house_id = ?`)
      .bind(houseId)
      .all<ProvinceRow>()
    return (result.results ?? []).map(mapProvince)
  }

  async findById(id: string): Promise<Province | null> {
    const row = await this.db
      .prepare(`SELECT ${PROVINCE_COLUMNS} FROM provinces WHERE id = ?`)
      .bind(id)
      .first<ProvinceRow>()
    return row ? mapProvince(row) : null
  }

  async listNeutral(): Promise<Province[]> {
    const result = await this.db
      .prepare(`SELECT ${PROVINCE_COLUMNS} FROM provinces WHERE house_id IS NULL`)
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

  async updateStats(
    provinceId: string,
    patch: {
      agriculture?: number
      commerce?: number
      loyalty?: number
      population?: number
      defense?: number
      garrison?: number
      tech?: number
      marketRate?: number
      updatedAt: number
    },
  ): Promise<void> {
    const current = await this.findById(provinceId)
    if (!current) return

    await this.db
      .prepare(
        `UPDATE provinces SET
           agriculture = ?, commerce = ?, loyalty = ?, population = ?,
           defense = ?, garrison = ?, tech = ?, market_rate = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        patch.agriculture ?? current.agriculture,
        patch.commerce ?? current.commerce,
        patch.loyalty ?? current.loyalty,
        patch.population ?? current.population,
        patch.defense ?? current.defense,
        patch.garrison ?? current.garrison,
        patch.tech ?? current.tech,
        patch.marketRate ?? current.marketRate,
        patch.updatedAt,
        provinceId,
      )
      .run()
  }
}

export { POPULATION_MAX }
