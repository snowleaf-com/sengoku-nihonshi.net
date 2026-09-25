import type { WorldEvent, WorldEventChannel, WorldEventKind } from '../types'

type WorldEventRow = {
  id: string
  year: number
  month: number
  channel: string
  kind: string
  message: string
  province_id: string | null
  from_province_id: string | null
  character_id: string | null
  house_id: string | null
  created_at: number
}

const EVENT_COLUMNS = `id, year, month, channel, kind, message, province_id, from_province_id, character_id, house_id, created_at`

function mapEvent(row: WorldEventRow): WorldEvent {
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    channel: row.channel as WorldEventChannel,
    kind: row.kind as WorldEventKind,
    message: row.message,
    provinceId: row.province_id,
    fromProvinceId: row.from_province_id,
    characterId: row.character_id,
    houseId: row.house_id,
    createdAt: row.created_at,
  }
}

export class WorldEventRepository {
  constructor(private readonly db: D1Database) {}

  async listRecent(input: {
    channel: WorldEventChannel
    limit?: number
    characterId?: string
  }): Promise<WorldEvent[]> {
    const limit = input.limit ?? 40
    if (input.characterId) {
      const result = await this.db
        .prepare(
          `SELECT ${EVENT_COLUMNS}
           FROM world_events
           WHERE channel = ? AND character_id = ?
           ORDER BY created_at DESC
           LIMIT ?`,
        )
        .bind(input.channel, input.characterId, limit)
        .all<WorldEventRow>()
      return (result.results ?? []).map(mapEvent)
    }

    const result = await this.db
      .prepare(
        `SELECT ${EVENT_COLUMNS}
         FROM world_events
         WHERE channel = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(input.channel, limit)
      .all<WorldEventRow>()
    return (result.results ?? []).map(mapEvent)
  }

  /** 最近の戦争ニュース（侵攻矢印用。from→to が揃っているもの） */
  async listRecentWars(limit = 12): Promise<WorldEvent[]> {
    const result = await this.db
      .prepare(
        `SELECT ${EVENT_COLUMNS}
         FROM world_events
         WHERE channel = 'news' AND kind = 'war'
           AND province_id IS NOT NULL AND from_province_id IS NOT NULL
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(limit)
      .all<WorldEventRow>()
    return (result.results ?? []).map(mapEvent)
  }

  async insert(input: {
    id: string
    year: number
    month: number
    channel: WorldEventChannel
    kind: WorldEventKind
    message: string
    provinceId?: string | null
    fromProvinceId?: string | null
    characterId?: string | null
    houseId?: string | null
    createdAt: number
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO world_events
         (id, year, month, channel, kind, message, province_id, from_province_id, character_id, house_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.id,
        input.year,
        input.month,
        input.channel,
        input.kind,
        input.message,
        input.provinceId ?? null,
        input.fromProvinceId ?? null,
        input.characterId ?? null,
        input.houseId ?? null,
        input.createdAt,
      )
      .run()
  }

  async insertMany(
    inputs: Array<{
      id: string
      year: number
      month: number
      channel: WorldEventChannel
      kind: WorldEventKind
      message: string
      provinceId?: string | null
      fromProvinceId?: string | null
      characterId?: string | null
      houseId?: string | null
      createdAt: number
    }>,
  ): Promise<void> {
    if (inputs.length === 0) return
    const stmts = inputs.map((input) =>
      this.db
        .prepare(
          `INSERT INTO world_events
           (id, year, month, channel, kind, message, province_id, from_province_id, character_id, house_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          input.id,
          input.year,
          input.month,
          input.channel,
          input.kind,
          input.message,
          input.provinceId ?? null,
          input.fromProvinceId ?? null,
          input.characterId ?? null,
          input.houseId ?? null,
          input.createdAt,
        ),
    )
    await this.db.batch(stmts)
  }
}
