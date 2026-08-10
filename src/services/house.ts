import {
  HOUSE_NAME_MAX,
  HOUSE_NAME_MIN,
  HOUSE_ROLES,
  nextHouseColor,
} from '../config/game'
import { createId, nowSeconds } from '../lib/id'
import { CharacterRepository } from '../repositories/characters'
import { HouseRoleRepository } from '../repositories/house-roles'
import { HouseRepository } from '../repositories/houses'
import { ProvinceRepository } from '../repositories/provinces'
import type { House } from '../types'
import { DomainError } from './character'

export function normalizeHouseName(raw: string): string {
  return raw.trim().replace(/\s+/g, '')
}

export function validateHouseName(name: string): string | null {
  if (name.length < HOUSE_NAME_MIN || name.length > HOUSE_NAME_MAX) {
    return `家名は${HOUSE_NAME_MIN}〜${HOUSE_NAME_MAX}文字で入力してください`
  }
  if (/[<>&"'`]/.test(name)) {
    return '家名に使用できない文字が含まれています'
  }
  return null
}

/**
 * 旗揚げ: 居る国が中立なら家を立て、当主となり国を支配する。
 * MVP では厳しい条件を設けない。
 */
export async function raiseHouse(
  db: D1Database,
  input: { userId: string; houseName: string },
): Promise<{ house: House }> {
  const characters = new CharacterRepository(db)
  const character = await characters.findByUserId(input.userId)
  if (!character) throw new DomainError('先に武将を作成してください')
  if (character.houseId) throw new DomainError('すでに家に属しています')

  const houseName = normalizeHouseName(input.houseName)
  const nameError = validateHouseName(houseName)
  if (nameError) throw new DomainError(nameError)

  const houses = new HouseRepository(db)
  const same = await houses.findByName(houseName)
  if (same) throw new DomainError('その家名はすでに使われています')

  const provinces = new ProvinceRepository(db)
  const province = await provinces.findById(character.provinceId)
  if (!province) throw new DomainError('所在国が見つかりません')
  if (province.houseId) {
    throw new DomainError('この国はすでに支配されています。中立国で旗揚げしてください')
  }

  const now = nowSeconds()
  const active = await houses.listActive()
  const houseId = createId(16)
  const characterId = character.id

  const house = await houses.create({
    id: houseId,
    name: houseName,
    leaderCharacterId: characterId,
    color: nextHouseColor(active.length),
    createdAt: now,
  })

  await characters.assignHouse(characterId, houseId, now)
  await provinces.updateOwner(province.id, houseId, now)

  const roles = new HouseRoleRepository(db)
  await roles.create({
    id: createId(16),
    houseId,
    characterId,
    role: HOUSE_ROLES.lord,
    createdAt: now,
  })

  return { house }
}
