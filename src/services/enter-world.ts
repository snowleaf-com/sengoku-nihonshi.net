import { CharacterRepository } from '../repositories/characters'
import { ProvinceRepository } from '../repositories/provinces'
import type { Character, House } from '../types'
import { createCharacter, DomainError } from './character'
import { enlistInHouse, raiseHouse } from './house'
import { ensureProvincesSeeded } from './world'

export type EnterWorldResult =
  | { path: 'found'; character: Character; house: House }
  | { path: 'enlist'; character: Character; house: House }

/**
 * 武将作成時の入口。
 * 中立国 → 建国（家名必須）、支配国 → 仕官。
 */
export async function enterWorld(
  db: D1Database,
  input: {
    userId: string
    name: string
    iconId: string
    provinceId: string
    houseName?: string
  },
): Promise<EnterWorldResult> {
  await ensureProvincesSeeded(db)

  if (!input.provinceId) {
    throw new DomainError('初期位置を選んでください')
  }

  const provinces = new ProvinceRepository(db)
  const start = await provinces.findById(input.provinceId)
  if (!start) {
    throw new DomainError('選択した国が見つかりません')
  }

  if (start.houseId) {
    await createCharacter(db, {
      userId: input.userId,
      name: input.name,
      iconId: input.iconId,
      provinceId: start.id,
    })
    const { house, character } = await enlistInHouse(db, { userId: input.userId })
    return { path: 'enlist', character, house }
  }

  const houseName = input.houseName?.trim() ?? ''
  if (!houseName) {
    throw new DomainError('建国するには家名を入力してください')
  }

  await createCharacter(db, {
    userId: input.userId,
    name: input.name,
    iconId: input.iconId,
    provinceId: start.id,
  })
  const { house } = await raiseHouse(db, { userId: input.userId, houseName })
  const character = await new CharacterRepository(db).findByUserId(input.userId)
  if (!character) throw new DomainError('建国処理に失敗しました')
  return { path: 'found', character, house }
}
