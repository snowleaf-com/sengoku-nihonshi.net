import type { GameDate } from '../config/calendar'
import type { GameState } from '../types'

type GameStateRow = {
  id: number
  year: number
  month: number
  turn_index: number
  next_turn_at: number
  maintenance: number
  updated_at: number
}

function mapGameState(row: GameStateRow): GameState {
  return {
    year: row.year,
    month: row.month,
    turnIndex: row.turn_index,
    nextTurnAt: row.next_turn_at,
    maintenance: row.maintenance ?? 0,
    updatedAt: row.updated_at,
  }
}

export class GameStateRepository {
  constructor(private readonly db: D1Database) {}

  async get(): Promise<GameState> {
    const row = await this.db
      .prepare(
        `SELECT id, year, month, turn_index, next_turn_at, maintenance, updated_at
         FROM game_state WHERE id = 1`,
      )
      .first<GameStateRow>()

    if (!row) {
      throw new Error('game_state row is missing')
    }
    return mapGameState(row)
  }

  async save(input: {
    date: GameDate
    turnIndex: number
    nextTurnAt: number
    updatedAt: number
    maintenance?: number
  }): Promise<GameState> {
    const current = await this.get()
    const maintenance = input.maintenance ?? current.maintenance
    await this.db
      .prepare(
        `UPDATE game_state
         SET year = ?, month = ?, turn_index = ?, next_turn_at = ?, maintenance = ?, updated_at = ?
         WHERE id = 1`,
      )
      .bind(
        input.date.year,
        input.date.month,
        input.turnIndex,
        input.nextTurnAt,
        maintenance,
        input.updatedAt,
      )
      .run()

    return {
      year: input.date.year,
      month: input.date.month,
      turnIndex: input.turnIndex,
      nextTurnAt: input.nextTurnAt,
      maintenance,
      updatedAt: input.updatedAt,
    }
  }

  async setMaintenance(maintenance: number, updatedAt: number): Promise<void> {
    await this.db
      .prepare(`UPDATE game_state SET maintenance = ?, updated_at = ? WHERE id = 1`)
      .bind(maintenance ? 1 : 0, updatedAt)
      .run()
  }
}
