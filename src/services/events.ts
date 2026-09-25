import { createId, nowSeconds } from '../lib/id'
import { WorldEventRepository } from '../repositories/world-events'
import type { WorldEvent, WorldEventChannel, WorldEventKind } from '../types'

export const ACTION_RESULT_LIMIT = 24
export const WORLD_NEWS_LIMIT = 40

const KIND_LABELS: Record<WorldEventKind, string> = {
  command: '実行',
  income: '収入',
  war: '戦',
  disaster: '災',
  riot: '一揆',
  social: '人事',
  system: '知らせ',
}

export function worldEventKindLabel(kind: WorldEventKind): string {
  return KIND_LABELS[kind]
}

export async function listActionResults(
  db: D1Database,
  characterId: string,
  limit = ACTION_RESULT_LIMIT,
): Promise<WorldEvent[]> {
  return new WorldEventRepository(db).listRecent({
    channel: 'result',
    characterId,
    limit,
  })
}

export async function listWorldNews(
  db: D1Database,
  limit = WORLD_NEWS_LIMIT,
): Promise<WorldEvent[]> {
  return new WorldEventRepository(db).listRecent({
    channel: 'news',
    limit,
  })
}

/** @deprecated use listWorldNews / listActionResults */
export async function listWorldEvents(db: D1Database, limit = WORLD_NEWS_LIMIT): Promise<WorldEvent[]> {
  return listWorldNews(db, limit)
}

type RecordInput = {
  year: number
  month: number
  channel: WorldEventChannel
  kind: WorldEventKind
  message: string
  provinceId?: string | null
  fromProvinceId?: string | null
  characterId?: string | null
  houseId?: string | null
  createdAt?: number
}

export type WarInvasionArrow = {
  fromProvinceId: string
  toProvinceId: string
}

/** 最近の侵攻（from→to）。同一経路は最新のみ。 */
export async function listRecentWarInvasions(
  db: D1Database,
  limit = 8,
): Promise<WarInvasionArrow[]> {
  const events = await new WorldEventRepository(db).listRecentWars(Math.max(limit * 2, 12))
  const seen = new Set<string>()
  const arrows: WarInvasionArrow[] = []
  for (const event of events) {
    if (!event.fromProvinceId || !event.provinceId) continue
    const key = `${event.fromProvinceId}->${event.provinceId}`
    if (seen.has(key)) continue
    seen.add(key)
    arrows.push({
      fromProvinceId: event.fromProvinceId,
      toProvinceId: event.provinceId,
    })
    if (arrows.length >= limit) break
  }
  return arrows
}

export async function recordWorldEvent(db: D1Database, input: RecordInput): Promise<void> {
  await new WorldEventRepository(db).insert({
    id: createId(16),
    year: input.year,
    month: input.month,
    channel: input.channel,
    kind: input.kind,
    message: input.message,
    provinceId: input.provinceId,
    fromProvinceId: input.fromProvinceId,
    characterId: input.characterId,
    houseId: input.houseId,
    createdAt: input.createdAt ?? nowSeconds(),
  })
}

export async function recordWorldEvents(db: D1Database, events: RecordInput[]): Promise<void> {
  if (events.length === 0) return
  const createdAt = nowSeconds()
  await new WorldEventRepository(db).insertMany(
    events.map((event) => ({
      id: createId(16),
      year: event.year,
      month: event.month,
      channel: event.channel,
      kind: event.kind,
      message: event.message,
      provinceId: event.provinceId,
      fromProvinceId: event.fromProvinceId,
      characterId: event.characterId,
      houseId: event.houseId,
      createdAt: event.createdAt ?? createdAt,
    })),
  )
}
