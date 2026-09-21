/**
 * 三国志.NET 由来のゲーム定数（N1）。
 * 詳細は docs/net-spec.md。
 */

/** 先行入力枠（原本 $MAX_COM） */
export const COMMAND_QUEUE_MAX = 24

/** 能力 +1 に必要な EX（原本は 10） */
export const STAT_EX_PER_LEVEL = 10

/** 内政成功時の貢献 */
export const COMMAND_CONTRIBUTION = 30

/** 内政の金コスト */
export const DOMESTIC_GOLD_COST = 50

/** 米施しの米コスト */
export const RICE_GIVE_COST = 50

/** 農民上限（原本 $NOU_MAX） */
export const POPULATION_MAX = 30000

/** 技術上限 */
export const TECH_MAX = 999

/** 階級アップ単位（原本 $LANK） */
export const CLASS_PER_RANK = 500

/** 給与・俸禄の個人上限ベース */
export const SALARY_BASE_CAP = 1000
export const SALARY_CAP_PER_RANK = 150
export const SALARY_RANK_MAX = 20

/** 初期相場 */
export const DEFAULT_MARKET_RATE = 1.0

/** 米売買の1回上限（原本） */
export const TRADE_MAX = 3000

/** 移動成功時の貢献（所属ありのみ） */
export const MOVE_CONTRIBUTION = 20

/** 相場の上下限 */
export const MARKET_RATE_MIN = 0.8
export const MARKET_RATE_MAX = 1.2

/**
 * NET 開発系の上昇量。
 * int(stat/20 + rand(stat)/40) ※書籍補正は当面 0
 */
export function netStatGain(stat: number, bookBonus = 0): number {
  const base = Math.max(0, stat + bookBonus)
  if (base <= 0) return 0
  return Math.floor(base / 20 + (Math.random() * base) / 40)
}

/** テスト用に乱数を固定したいとき */
export function netStatGainWithRandom(
  stat: number,
  random01: number,
  bookBonus = 0,
): number {
  const base = Math.max(0, stat + bookBonus)
  if (base <= 0) return 0
  const r = Math.min(1, Math.max(0, random01)) * base
  return Math.floor(base / 20 + r / 40)
}
