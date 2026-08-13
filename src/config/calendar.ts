/** ゲーム内カレンダー（1ターン＝1か月） */

export const START_YEAR = 1467
export const START_MONTH = 1

/** 実時間のターン間隔（秒）。開発中は短め、公開は 1800（30分）想定 */
export const TURN_INTERVAL_SECONDS = 60

/** 税金（金）が入る月 */
export const TAX_MONTH = 1

/** 年貢（米）が入る月 */
export const TRIBUTE_MONTH = 7

export type GameDate = {
  year: number
  month: number
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

const SEASON_LABELS: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
}

/** 3–5春 / 6–8夏 / 9–11秋 / 12–2冬 */
export function seasonOfMonth(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export function seasonLabel(season: Season): string {
  return SEASON_LABELS[season]
}

export function formatGameDate(date: GameDate): string {
  return `${date.year}年${date.month}月`
}

export function advanceMonth(date: GameDate): GameDate {
  if (date.month >= 12) {
    return { year: date.year + 1, month: 1 }
  }
  return { year: date.year, month: date.month + 1 }
}

/** 予約枠 index（0始まり）が実行される月。枠0＝現在月 */
export function monthAtQueueOffset(currentMonth: number, offset: number): number {
  return ((currentMonth - 1 + Math.max(0, offset)) % 12) + 1
}

/** 予約枠 index（0始まり）が実行される年月。枠0＝現在年月 */
export function dateAtQueueOffset(date: GameDate, offset: number): GameDate {
  const months = Math.max(0, Math.floor(offset))
  const total = (date.year * 12 + (date.month - 1)) + months
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1,
  }
}

export function isTaxMonth(month: number): boolean {
  return month === TAX_MONTH
}

export function isTributeMonth(month: number): boolean {
  return month === TRIBUTE_MONTH
}
