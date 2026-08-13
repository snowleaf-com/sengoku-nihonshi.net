import type { CharacterCommand } from '../types'

type CommandRow = {
  id: string
  character_id: string
  command_id: string
  position: number
  created_at: number
}

function mapCommand(row: CommandRow): CharacterCommand {
  return {
    id: row.id,
    characterId: row.character_id,
    commandId: row.command_id,
    position: row.position,
    createdAt: row.created_at,
  }
}

export class CharacterCommandRepository {
  constructor(private readonly db: D1Database) {}

  async listByCharacter(characterId: string): Promise<CharacterCommand[]> {
    const result = await this.db
      .prepare(
        `SELECT id, character_id, command_id, position, created_at
         FROM character_commands
         WHERE character_id = ?
         ORDER BY position ASC`,
      )
      .bind(characterId)
      .all<CommandRow>()
    return (result.results ?? []).map(mapCommand)
  }

  async countByCharacter(characterId: string): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) AS c FROM character_commands WHERE character_id = ?`)
      .bind(characterId)
      .first<{ c: number }>()
    return row?.c ?? 0
  }

  async enqueue(input: {
    id: string
    characterId: string
    commandId: string
    position: number
    createdAt: number
  }): Promise<CharacterCommand> {
    await this.db
      .prepare(
        `INSERT INTO character_commands (id, character_id, command_id, position, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(input.id, input.characterId, input.commandId, input.position, input.createdAt)
      .run()

    return {
      id: input.id,
      characterId: input.characterId,
      commandId: input.commandId,
      position: input.position,
      createdAt: input.createdAt,
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM character_commands WHERE id = ?`).bind(id).run()
  }

  async listFirstPerCharacter(): Promise<CharacterCommand[]> {
    const result = await this.db
      .prepare(
        `SELECT c.id, c.character_id, c.command_id, c.position, c.created_at
         FROM character_commands c
         INNER JOIN (
           SELECT character_id, MIN(position) AS min_position
           FROM character_commands
           GROUP BY character_id
         ) first ON first.character_id = c.character_id AND first.min_position = c.position`,
      )
      .all<CommandRow>()
    return (result.results ?? []).map(mapCommand)
  }

  async resequence(characterId: string): Promise<void> {
    const rows = await this.listByCharacter(characterId)
    if (rows.length === 0) return
    const stmts = rows.map((row, index) =>
      this.db
        .prepare(`UPDATE character_commands SET position = ? WHERE id = ?`)
        .bind(index, row.id),
    )
    await this.db.batch(stmts)
  }
}
