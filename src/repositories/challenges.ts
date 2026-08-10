import type { ChallengeRecord, ChallengeType } from '../types'

type ChallengeRow = {
  id: string
  challenge: string
  type: ChallengeType
  user_id: string | null
  webauthn_user_id: string | null
  expires_at: number
  created_at: number
}

function mapChallenge(row: ChallengeRow): ChallengeRecord {
  return {
    id: row.id,
    challenge: row.challenge,
    type: row.type,
    userId: row.user_id,
    webauthnUserId: row.webauthn_user_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

export class ChallengeRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    id: string
    challenge: string
    type: ChallengeType
    userId: string | null
    webauthnUserId: string | null
    expiresAt: number
    createdAt: number
  }): Promise<ChallengeRecord> {
    await this.db
      .prepare(
        `INSERT INTO webauthn_challenges (
           id, challenge, type, user_id, webauthn_user_id, expires_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.id,
        input.challenge,
        input.type,
        input.userId,
        input.webauthnUserId,
        input.expiresAt,
        input.createdAt,
      )
      .run()

    return {
      id: input.id,
      challenge: input.challenge,
      type: input.type,
      userId: input.userId,
      webauthnUserId: input.webauthnUserId,
      expiresAt: input.expiresAt,
      createdAt: input.createdAt,
    }
  }

  async findById(id: string): Promise<ChallengeRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, challenge, type, user_id, webauthn_user_id, expires_at, created_at
         FROM webauthn_challenges WHERE id = ?`,
      )
      .bind(id)
      .first<ChallengeRow>()

    return row ? mapChallenge(row) : null
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM webauthn_challenges WHERE id = ?`).bind(id).run()
  }

  async deleteExpired(now: number): Promise<void> {
    await this.db
      .prepare(`DELETE FROM webauthn_challenges WHERE expires_at < ?`)
      .bind(now)
      .run()
  }
}
