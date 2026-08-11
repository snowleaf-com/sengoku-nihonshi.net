/** 武将名の最大文字数（書記素単位ではなく UTF-16 code unit。MVP 十分） */
export const CHARACTER_NAME_MAX_LENGTH = 16

/**
 * 武将名を正規化・検証する。
 * 空・長すぎ・制御文字のみは拒否。前後空白は落とす。
 */
export function normalizeCharacterName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim()
  if (!name) return null
  if (name.length > CHARACTER_NAME_MAX_LENGTH) return null
  // 表示不能な制御文字を弾く
  if (/[\u0000-\u001f\u007f]/.test(name)) return null
  return name
}
