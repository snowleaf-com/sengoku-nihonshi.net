import type { User } from '../types'

type UserRow = {
  id: string
  created_at: number
  updated_at: number
  last_login_at: number | null
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  }
}

export class UserRepository {
  constructor(private readonly db: D1Database) {}

  async create(id: string, now: number): Promise<User> {
    await this.db
      .prepare(
        `INSERT INTO users (id, created_at, updated_at, last_login_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(id, now, now, now)
      .run()

    return {
      id,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    }
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db
      .prepare(
        `SELECT id, created_at, updated_at, last_login_at
         FROM users WHERE id = ?`,
      )
      .bind(id)
      .first<UserRow>()

    return row ? mapUser(row) : null
  }

  async touchLogin(id: string, now: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE users
         SET last_login_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(now, now, id)
      .run()
  }
}
