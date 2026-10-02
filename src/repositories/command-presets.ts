export type CommandPresetStep = {
  commandId: string
  payload: string | null
}

export type CommandPreset = {
  id: string
  characterId: string
  slot: number
  name: string
  steps: CommandPresetStep[]
  updatedAt: number
}

type PresetRow = {
  id: string
  character_id: string
  slot: number
  name: string
  steps_json: string
  updated_at: number
}

function parseSteps(raw: string): CommandPresetStep[] {
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const row = item as { commandId?: unknown; payload?: unknown }
      if (typeof row.commandId !== 'string' || row.commandId.length === 0) return []
      const payload = typeof row.payload === 'string' ? row.payload : null
      return [{ commandId: row.commandId, payload }]
    })
  } catch {
    return []
  }
}

function mapPreset(row: PresetRow): CommandPreset {
  return {
    id: row.id,
    characterId: row.character_id,
    slot: row.slot,
    name: row.name,
    steps: parseSteps(row.steps_json),
    updatedAt: row.updated_at,
  }
}

export class CommandPresetRepository {
  constructor(private readonly db: D1Database) {}

  async listByCharacter(characterId: string): Promise<CommandPreset[]> {
    const result = await this.db
      .prepare(
        `SELECT id, character_id, slot, name, steps_json, updated_at
         FROM command_presets
         WHERE character_id = ?
         ORDER BY slot ASC`,
      )
      .bind(characterId)
      .all<PresetRow>()
    return (result.results ?? []).map(mapPreset)
  }

  async findBySlot(characterId: string, slot: number): Promise<CommandPreset | null> {
    const row = await this.db
      .prepare(
        `SELECT id, character_id, slot, name, steps_json, updated_at
         FROM command_presets
         WHERE character_id = ? AND slot = ?`,
      )
      .bind(characterId, slot)
      .first<PresetRow>()
    return row ? mapPreset(row) : null
  }

  async upsert(input: {
    id: string
    characterId: string
    slot: number
    name: string
    steps: CommandPresetStep[]
    updatedAt: number
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO command_presets (id, character_id, slot, name, steps_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (character_id, slot) DO UPDATE SET
           name = excluded.name,
           steps_json = excluded.steps_json,
           updated_at = excluded.updated_at`,
      )
      .bind(
        input.id,
        input.characterId,
        input.slot,
        input.name,
        JSON.stringify(input.steps),
        input.updatedAt,
      )
      .run()
  }

  async deleteByCharacterId(characterId: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM command_presets WHERE character_id = ?`)
      .bind(characterId)
      .run()
  }
}
