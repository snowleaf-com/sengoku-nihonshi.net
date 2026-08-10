import type { PasskeyRecord } from '../types'

type PasskeyRow = {
  id: string
  user_id: string
  webauthn_user_id: string
  public_key: ArrayBuffer
  counter: number
  device_type: string
  backed_up: number
  transports: string | null
  created_at: number
  last_used_at: number | null
}

function parseTransports(value: string | null): string[] | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : null
  } catch {
    return null
  }
}

function mapPasskey(row: PasskeyRow): PasskeyRecord {
  return {
    id: row.id,
    userId: row.user_id,
    webauthnUserId: row.webauthn_user_id,
    publicKey: new Uint8Array(row.public_key),
    counter: row.counter,
    deviceType: row.device_type,
    backedUp: row.backed_up === 1,
    transports: parseTransports(row.transports),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }
}

export type CreatePasskeyInput = {
  id: string
  userId: string
  webauthnUserId: string
  publicKey: Uint8Array
  counter: number
  deviceType: string
  backedUp: boolean
  transports: string[] | null
  createdAt: number
}

export class PasskeyRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: CreatePasskeyInput): Promise<PasskeyRecord> {
    await this.db
      .prepare(
        `INSERT INTO passkeys (
           id, user_id, webauthn_user_id, public_key, counter,
           device_type, backed_up, transports, created_at, last_used_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      )
      .bind(
        input.id,
        input.userId,
        input.webauthnUserId,
        input.publicKey,
        input.counter,
        input.deviceType,
        input.backedUp ? 1 : 0,
        input.transports ? JSON.stringify(input.transports) : null,
        input.createdAt,
      )
      .run()

    return {
      ...input,
      lastUsedAt: null,
    }
  }

  async findByCredentialId(id: string): Promise<PasskeyRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_id, webauthn_user_id, public_key, counter,
                device_type, backed_up, transports, created_at, last_used_at
         FROM passkeys WHERE id = ?`,
      )
      .bind(id)
      .first<PasskeyRow>()

    return row ? mapPasskey(row) : null
  }

  async listByUserId(userId: string): Promise<PasskeyRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT id, user_id, webauthn_user_id, public_key, counter,
                device_type, backed_up, transports, created_at, last_used_at
         FROM passkeys WHERE user_id = ?`,
      )
      .bind(userId)
      .all<PasskeyRow>()

    return (result.results ?? []).map(mapPasskey)
  }

  async updateCounter(id: string, counter: number, lastUsedAt: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE passkeys
         SET counter = ?, last_used_at = ?
         WHERE id = ?`,
      )
      .bind(counter, lastUsedAt, id)
      .run()
  }
}
