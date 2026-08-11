/**
 * 武将アイコンのプリセット一覧。
 * ファイルは public/icons/{id}.webp（busho_01〜36）。
 * label は names.txt と対応（見た目のアーキタイプ名。同名あり）。
 */
export const CHARACTER_ICONS = [
  { id: 'busho_01', label: '若武者' },
  { id: 'busho_02', label: '浪人' },
  { id: 'busho_03', label: '足軽' },
  { id: 'busho_04', label: '侍' },
  { id: 'busho_05', label: '地侍' },
  { id: 'busho_06', label: '侍大将' },
  { id: 'busho_07', label: '家老' },
  { id: 'busho_08', label: '大名' },
  { id: 'busho_09', label: '老将' },
  { id: 'busho_10', label: '軍師' },
  { id: 'busho_11', label: '女性武将' },
  { id: 'busho_12', label: '僧兵' },
  { id: 'busho_13', label: '豪傑' },
  { id: 'busho_14', label: '武将' },
  { id: 'busho_15', label: '武将' },
  { id: 'busho_16', label: '侍大将' },
  { id: 'busho_17', label: '足軽大将' },
  { id: 'busho_18', label: '武将' },
  { id: 'busho_19', label: '足軽' },
  { id: 'busho_20', label: '浪人' },
  { id: 'busho_21', label: '若武者' },
  { id: 'busho_22', label: '僧兵' },
  { id: 'busho_23', label: '軍師' },
  { id: 'busho_24', label: '忍者' },
  { id: 'busho_25', label: '剣豪' },
  { id: 'busho_26', label: '侍大将' },
  { id: 'busho_27', label: '家老' },
  { id: 'busho_28', label: '武将' },
  { id: 'busho_29', label: '女性武将' },
  { id: 'busho_30', label: '傭兵' },
  { id: 'busho_31', label: '豪将' },
  { id: 'busho_32', label: '老将' },
  { id: 'busho_33', label: '弓将' },
  { id: 'busho_34', label: '老臣' },
  { id: 'busho_35', label: 'くノ一' },
  { id: 'busho_36', label: '僧侶' },
] as const

export type CharacterIconId = (typeof CHARACTER_ICONS)[number]['id']

export const CHARACTER_ICON_IDS = CHARACTER_ICONS.map((icon) => icon.id) as unknown as CharacterIconId[]

const ICON_BY_ID = new Map(CHARACTER_ICONS.map((icon) => [icon.id, icon]))

export function isCharacterIconId(value: string): value is CharacterIconId {
  return ICON_BY_ID.has(value as CharacterIconId)
}

export function getCharacterIcon(iconId: string) {
  return ICON_BY_ID.get(iconId as CharacterIconId) ?? null
}

export function iconPublicPath(iconId: CharacterIconId | string): string {
  return `/icons/${iconId}.webp`
}
