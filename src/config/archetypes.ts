/**
 * Phase 1.5: 立ち回り選択 → 能力の初期値 → 3能力だけ調整。
 *
 * 三国志NET古典と同様、入力は 武勇・知略・統率 の3つ（各 5〜100）。
 * 徳望（人望相当）は立ち回りで決まり、プレイヤーは触れない。
 */

export const STAT_MIN = 5
export const STAT_MAX = 100

/** 調整可能な3能力の合計（固定） */
export const ADJUSTABLE_STAT_TOTAL = 150

export type AdjustableStats = {
  buyu: number
  chiryaku: number
  toso: number
}

export type CharacterStats = AdjustableStats & {
  tokubo: number
}

export const ARCHETYPES = [
  {
    id: 'battle',
    label: '合戦向き',
    blurb: '武勇と統率に振る。戦う・兵を抱える',
    /** 武勇・統率へ寄せ、知略は下限 */
    base: { buyu: 80, chiryaku: 5, toso: 65 },
    tokubo: 25,
  },
  {
    id: 'domestic',
    label: '内政向き',
    blurb: '知略寄り。農商を伸ばして国を潤す',
    base: { buyu: 20, chiryaku: 80, toso: 50 },
    tokubo: 60,
  },
  {
    id: 'strategy',
    label: '知略向き',
    blurb: '武勇を抑えて知略と統率へ。策と工夫',
    /** 武勇下限、残りを知略・統率へ */
    base: { buyu: 5, chiryaku: 80, toso: 65 },
    tokubo: 30,
  },
  {
    id: 'command',
    label: '統率向き',
    blurb: '統率を厚く。多くの兵を率いる',
    /** 統率最大寄り、武勇は中、知略は下限 */
    base: { buyu: 45, chiryaku: 5, toso: 100 },
    tokubo: 35,
  },
] as const

export type ArchetypeId = (typeof ARCHETYPES)[number]['id']

const ARCHETYPE_BY_ID = new Map(ARCHETYPES.map((a) => [a.id, a]))

export function isArchetypeId(value: string): value is ArchetypeId {
  return ARCHETYPE_BY_ID.has(value as ArchetypeId)
}

export function getArchetype(id: string) {
  return ARCHETYPE_BY_ID.get(id as ArchetypeId) ?? null
}

function clampStat(value: number): number {
  return Math.min(STAT_MAX, Math.max(STAT_MIN, value))
}

export function defaultStatsForArchetype(archetypeId: ArchetypeId): CharacterStats {
  const archetype = getArchetype(archetypeId) ?? getArchetype('domestic')!
  return {
    buyu: archetype.base.buyu,
    chiryaku: archetype.base.chiryaku,
    toso: archetype.base.toso,
    tokubo: archetype.tokubo,
  }
}

export function parseStatValue(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isInteger(n)) return null
  return n
}

/**
 * 立ち回り＋入力された3能力から最終能力を決める。
 * 徳望は常に立ち回り固定。3能力は合計が ADJUSTABLE_STAT_TOTAL であること。
 */
export function resolveCharacterStats(
  archetypeId: ArchetypeId,
  input: { buyu?: number | null; chiryaku?: number | null; toso?: number | null },
): { ok: true; stats: CharacterStats } | { ok: false; error: string } {
  const defaults = defaultStatsForArchetype(archetypeId)
  const buyu = input.buyu ?? defaults.buyu
  const chiryaku = input.chiryaku ?? defaults.chiryaku
  const toso = input.toso ?? defaults.toso

  for (const [label, value] of [
    ['武勇', buyu],
    ['知略', chiryaku],
    ['統率', toso],
  ] as const) {
    if (!Number.isInteger(value) || value < STAT_MIN || value > STAT_MAX) {
      return {
        ok: false,
        error: `${label}は${STAT_MIN}〜${STAT_MAX}の整数で指定してください`,
      }
    }
  }

  if (buyu + chiryaku + toso !== ADJUSTABLE_STAT_TOTAL) {
    return {
      ok: false,
      error: `武勇・知略・統率の合計は${ADJUSTABLE_STAT_TOTAL}にしてください`,
    }
  }

  return {
    ok: true,
    stats: {
      buyu: clampStat(buyu),
      chiryaku: clampStat(chiryaku),
      toso: clampStat(toso),
      tokubo: defaults.tokubo,
    },
  }
}
