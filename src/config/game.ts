/** 武将ランク（個人成長）。天下人は通常ランク外の称号候補。 */
export const CHARACTER_RANKS = [
  { id: 1, name: '無名' },
  { id: 2, name: '郷民' },
  { id: 3, name: '雑兵' },
  { id: 4, name: '足軽' },
  { id: 5, name: '足軽組頭' },
  { id: 6, name: '足軽大将' },
  { id: 7, name: '徒士' },
  { id: 8, name: '侍' },
  { id: 9, name: '地侍' },
  { id: 10, name: '給人' },
  { id: 11, name: '組頭' },
  { id: 12, name: '物頭' },
  { id: 13, name: '侍大将' },
  { id: 14, name: '武将' },
  { id: 15, name: '重臣' },
  { id: 16, name: '宿老' },
  { id: 17, name: '城持' },
  { id: 18, name: '国人' },
  { id: 19, name: '大名' },
  { id: 20, name: '戦国大名' },
] as const

export function rankName(rank: number): string {
  return CHARACTER_RANKS.find((r) => r.id === rank)?.name ?? '無名'
}

/** 家中役職（ランクとは別）。Phase 1 では当主を中心に使う。 */
export const HOUSE_ROLES = {
  lord: '当主',
  retainer: '家臣',
} as const

export type HouseRoleId = keyof typeof HOUSE_ROLES

export const HOUSE_COLORS = [
  '#c45c26',
  '#2f6f4e',
  '#3b5b92',
  '#8a3d5b',
  '#6b5b2e',
  '#4a6a7b',
  '#7a4e2d',
  '#5c3d7a',
] as const

/** 次に旗揚げした家へ自動割当される色 */
export function nextHouseColor(activeHouseCount: number): string {
  return HOUSE_COLORS[activeHouseCount % HOUSE_COLORS.length]
}

export const CHARACTER_NAME_MIN = 1
export const CHARACTER_NAME_MAX = 12
export const HOUSE_NAME_MIN = 1
export const HOUSE_NAME_MAX = 8

/** 原本 NET は金1000/米500。序盤の手触りのため米・金を少し厚めにする */
export const STARTING_MONEY = 2000
export const STARTING_RICE = 1500
export const STARTING_TROOPS = 0
export const STARTING_LOYALTY = 50

const amountFormatter = new Intl.NumberFormat('ja-JP')

/** 所持金の表示（単位: 両） */
export function formatMoney(amount: number): string {
  return `${amountFormatter.format(amount)} 両`
}

/** 所持米の表示（単位: 石） */
export function formatRice(amount: number): string {
  return `${amountFormatter.format(amount)} 石`
}
