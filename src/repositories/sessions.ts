import type { Session } from '../types'

type SessionRow = {
  id: string
  user_id: string
  expires_at: number
  created_at: number
}

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

export class SessionRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    id: string
    userId: string
    expiresAt: number
    createdAt: number
  }): Promise<Session> {
    await this.db
      .prepare(
        `INSERT INTO sessions (id, user_id, expires_at, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(input.id, input.userId, input.expiresAt, input.createdAt)
      .run()

    return {
      id: input.id,
      userId: input.userId,
      expiresAt: input.expiresAt,
      createdAt: input.createdAt,
    }
  }

  async findById(id: string): Promise<Session | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_id, expires_at, created_at
         FROM sessions WHERE id = ?`,
      )
      .bind(id)
      .first<SessionRow>()

    return row ? mapSession(row) : null
  }

  async extend(id: string, expiresAt: number): Promise<void> {
    await this.db
      .prepare(`UPDATE sessions SET expires_at = ? WHERE id = ?`)
      .bind(expiresAt, id)
      .run()
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(id).run()
  }

  async deleteExpired(now: number): Promise<void> {
    await this.db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).bind(now).run()
  }
}
