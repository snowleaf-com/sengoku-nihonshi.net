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

export function formatGameDate(date: GameDate): string {
  return `${date.year}年${date.month}月`
}

export function advanceMonth(date: GameDate): GameDate {
  if (date.month >= 12) {
    return { year: date.year + 1, month: 1 }
  }
  return { year: date.year, month: date.month + 1 }
}

export function isTaxMonth(month: number): boolean {
  return month === TAX_MONTH
}

export function isTributeMonth(month: number): boolean {
  return month === TRIBUTE_MONTH
}
