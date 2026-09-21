import type { HouseMessage } from '../types'

type HouseMessageRow = {
  id: string
  house_id: string
  character_id: string
  body: string
  created_at: number
}

function mapMessage(row: HouseMessageRow): HouseMessage {
  return {
    id: row.id,
    houseId: row.house_id,
    characterId: row.character_id,
    body: row.body,
    createdAt: row.created_at,
  }
}

export type HouseMessageWithAuthor = HouseMessage & {
  authorName: string
}

type HouseMessageWithAuthorRow = HouseMessageRow & {
  author_name: string
}

export class HouseMessageRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    id: string
    houseId: string
    characterId: string
    body: string
    createdAt: number
  }): Promise<HouseMessage> {
    await this.db
      .prepare(
        `INSERT INTO house_messages (id, house_id, character_id, body, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(input.id, input.houseId, input.characterId, input.body, input.createdAt)
      .run()

    return {
      id: input.id,
      houseId: input.houseId,
      characterId: input.characterId,
      body: input.body,
      createdAt: input.createdAt,
    }
  }

  async listByHouse(houseId: string, limit = 50): Promise<HouseMessageWithAuthor[]> {
    const result = await this.db
      .prepare(
        `SELECT m.id, m.house_id, m.character_id, m.body, m.created_at,
                c.name AS author_name
         FROM house_messages m
         JOIN characters c ON c.id = m.character_id
         WHERE m.house_id = ?
         ORDER BY m.created_at DESC
         LIMIT ?`,
      )
      .bind(houseId, limit)
      .all<HouseMessageWithAuthorRow>()

    return (result.results ?? []).map((row) => ({
      ...mapMessage(row),
      authorName: row.author_name,
    }))
  }
}
