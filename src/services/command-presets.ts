import {
  COMMAND_QUEUE_MAX,
  buildCommandSlots,
  isCommandId,
  parseSlotPositions,
} from '../config/commands'
import { createId, nowSeconds } from '../lib/id'
import { CharacterCommandRepository } from '../repositories/character-commands'
import {
  CommandPresetRepository,
  type CommandPreset,
  type CommandPresetStep,
} from '../repositories/command-presets'
import { CharacterRepository } from '../repositories/characters'
import { DomainError } from './character'

export const PRESET_SLOT_COUNT = 3
export const PRESET_NAME_MAX = 8
export const PRESET_STEP_MAX = 12

export type CommandPresetView = {
  slot: number
  name: string
  steps: CommandPresetStep[]
}

async function requireCharacter(db: D1Database, userId: string) {
  const character = await new CharacterRepository(db).findByUserId(userId)
  if (!character) throw new DomainError('武将がいません')
  return character
}

function parseSlot(raw: number | string): number {
  const slot = typeof raw === 'number' ? raw : Number.parseInt(raw, 10)
  if (!Number.isInteger(slot) || slot < 1 || slot > PRESET_SLOT_COUNT) {
    throw new DomainError('定型の番号が不正です')
  }
  return slot
}

function normalizeName(raw: string, slot: number): string {
  const name = raw.trim()
  if (name.length === 0) return `定型${slot}`
  if (name.length > PRESET_NAME_MAX) {
    throw new DomainError(`定型名は${PRESET_NAME_MAX}文字までです`)
  }
  return name
}

export async function listCommandPresetViews(
  db: D1Database,
  characterId: string,
): Promise<CommandPresetView[]> {
  const saved = await new CommandPresetRepository(db).listByCharacter(characterId)
  const bySlot = new Map(saved.map((row) => [row.slot, row]))
  return Array.from({ length: PRESET_SLOT_COUNT }, (_, index) => {
    const slot = index + 1
    const row = bySlot.get(slot)
    return {
      slot,
      name: row?.name ?? '',
      steps: row?.steps ?? [],
    }
  })
}

/** 選択した予約枠の並び（コマンドと引数）を定型へ保存する */
export async function saveCommandPreset(
  db: D1Database,
  input: { userId: string; slot: number | string; name: string; positions: string[] },
): Promise<CommandPreset> {
  const slot = parseSlot(input.slot)
  const name = normalizeName(input.name, slot)
  const positions = parseSlotPositions(input.positions)
  if (positions.length === 0) throw new DomainError('定型にする予約枠を選んでください')
  if (positions.length > PRESET_STEP_MAX) {
    throw new DomainError(`定型は${PRESET_STEP_MAX}手までです`)
  }

  const character = await requireCharacter(db, input.userId)
  const commands = new CharacterCommandRepository(db)
  const slots = buildCommandSlots(await commands.listByCharacter(character.id))
  const steps: CommandPresetStep[] = positions.map((position) => {
    const row = slots[position]
    if (!row) throw new DomainError('空の枠は定型にできません')
    if (!isCommandId(row.commandId)) throw new DomainError('未知のコマンドは定型にできません')
    return { commandId: row.commandId, payload: row.payload }
  })

  const presets = new CommandPresetRepository(db)
  const now = nowSeconds()
  const existing = await presets.findBySlot(character.id, slot)
  await presets.upsert({
    id: existing?.id ?? createId(16),
    characterId: character.id,
    slot,
    name,
    steps,
    updatedAt: now,
  })
  const saved = await presets.findBySlot(character.id, slot)
  if (!saved) throw new DomainError('定型の保存に失敗しました')
  return saved
}

/**
 * 保存した定型を、選択した先頭枠からキューの末尾まで繰り返して書き込む。
 * 繰返と同じく、コマンドと引数をそのまま使う。
 */
export async function applyCommandPreset(
  db: D1Database,
  input: { userId: string; slot: number | string; positions: string[] },
): Promise<void> {
  const slot = parseSlot(input.slot)
  const positions = parseSlotPositions(input.positions)
  if (positions.length === 0) throw new DomainError('書き込む先頭の枠を選んでください')

  const character = await requireCharacter(db, input.userId)
  const preset = await new CommandPresetRepository(db).findBySlot(character.id, slot)
  if (!preset || preset.steps.length === 0) throw new DomainError('その定型は空です')
  for (const step of preset.steps) {
    if (!isCommandId(step.commandId)) throw new DomainError('定型に未知のコマンドがあります')
  }

  const start = positions[0]!
  const commands = new CharacterCommandRepository(db)
  const byPosition = new Map(
    (await commands.listByCharacter(character.id)).map((row) => [row.position, row]),
  )
  const createdAt = nowSeconds()
  const updates: Array<{ id: string; commandId: string; payload: string | null }> = []
  const inserts: Array<{
    id: string
    characterId: string
    commandId: string
    position: number
    payload: string | null
    createdAt: number
  }> = []

  for (let position = start; position < COMMAND_QUEUE_MAX; position += 1) {
    const step = preset.steps[(position - start) % preset.steps.length]!
    const existing = byPosition.get(position)
    if (existing) {
      updates.push({ id: existing.id, commandId: step.commandId, payload: step.payload })
    } else {
      inserts.push({
        id: createId(16),
        characterId: character.id,
        commandId: step.commandId,
        position,
        payload: step.payload,
        createdAt,
      })
    }
  }

  await commands.updateCommands(updates)
  await commands.enqueueMany(inserts)
}
