/**
 * 武将アイコンのプリセット一覧。
 * ファイルは public/icons/{id}.webp（busho_01〜36）。
 */
export const CHARACTER_ICON_IDS = [
  'busho_01',
  'busho_02',
  'busho_03',
  'busho_04',
  'busho_05',
  'busho_06',
  'busho_07',
  'busho_08',
  'busho_09',
  'busho_10',
  'busho_11',
  'busho_12',
  'busho_13',
  'busho_14',
  'busho_15',
  'busho_16',
  'busho_17',
  'busho_18',
  'busho_19',
  'busho_20',
  'busho_21',
  'busho_22',
  'busho_23',
  'busho_24',
  'busho_25',
  'busho_26',
  'busho_27',
  'busho_28',
  'busho_29',
  'busho_30',
  'busho_31',
  'busho_32',
  'busho_33',
  'busho_34',
  'busho_35',
  'busho_36',
] as const

export type CharacterIconId = (typeof CHARACTER_ICON_IDS)[number]

const ICON_ID_SET = new Set<string>(CHARACTER_ICON_IDS)

export function isCharacterIconId(value: string): value is CharacterIconId {
  return ICON_ID_SET.has(value)
}

export function iconPublicPath(iconId: CharacterIconId | string): string {
  return `/icons/${iconId}.webp`
}
