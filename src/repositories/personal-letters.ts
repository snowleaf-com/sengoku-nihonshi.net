import type { PersonalLetter } from '../types'

type LetterRow = {
  id: string
  from_character_id: string
  to_character_id: string
  body: string
  created_at: number
  read_at: number | null
}

function mapLetter(row: LetterRow): PersonalLetter {
  return {
    id: row.id,
    fromCharacterId: row.from_character_id,
    toCharacterId: row.to_character_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  }
}

export type InboxLetter = PersonalLetter & {
  fromName: string
}

type InboxLetterRow = LetterRow & {
  from_name: string
}

export class PersonalLetterRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    id: string
    fromCharacterId: string
    toCharacterId: string
    body: string
    createdAt: number
  }): Promise<PersonalLetter> {
    await this.db
      .prepare(
        `INSERT INTO personal_letters (id, from_character_id, to_character_id, body, created_at, read_at)
         VALUES (?, ?, ?, ?, ?, NULL)`,
      )
      .bind(
        input.id,
        input.fromCharacterId,
        input.toCharacterId,
        input.body,
        input.createdAt,
      )
      .run()

    return {
      id: input.id,
      fromCharacterId: input.fromCharacterId,
      toCharacterId: input.toCharacterId,
      body: input.body,
      createdAt: input.createdAt,
      readAt: null,
    }
  }

  async listInbox(toCharacterId: string, limit = 50): Promise<InboxLetter[]> {
    const result = await this.db
      .prepare(
        `SELECT l.id, l.from_character_id, l.to_character_id, l.body, l.created_at, l.read_at,
                c.name AS from_name
         FROM personal_letters l
         JOIN characters c ON c.id = l.from_character_id
         WHERE l.to_character_id = ?
         ORDER BY l.created_at DESC
         LIMIT ?`,
      )
      .bind(toCharacterId, limit)
      .all<InboxLetterRow>()

    return (result.results ?? []).map((row) => ({
      ...mapLetter(row),
      fromName: row.from_name,
    }))
  }

  async markRead(id: string, readAt: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE personal_letters SET read_at = ? WHERE id = ? AND read_at IS NULL`,
      )
      .bind(readAt, id)
      .run()
  }
}
