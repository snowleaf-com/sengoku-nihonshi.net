/** 何もしない連続回数での自動削除 */

export const IDLE_DELETE_THRESHOLD = 60

/** nashi 成功後の streak。削除すべきか */
export function nextIdleStreakAfterNashi(current: number): number {
  return Math.max(0, current) + 1
}

export function shouldDeleteForIdle(
  streak: number,
  threshold: number = IDLE_DELETE_THRESHOLD,
): boolean {
  return streak >= threshold
}
