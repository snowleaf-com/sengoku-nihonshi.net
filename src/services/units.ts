import { createId, nowSeconds } from '../lib/id'
import { CharacterRepository } from '../repositories/characters'
import { HouseRepository } from '../repositories/houses'
import { UnitRepository, type Unit } from '../repositories/units'
import { DomainError } from './character'

function normalizeUnitName(raw: string): string {
  return raw.trim().replace(/\s+/g, '')
}

async function requireOwnedCharacter(db: D1Database, userId: string) {
  const characters = new CharacterRepository(db)
  const character = await characters.findByUserId(userId)
  if (!character) throw new DomainError('武将が見つかりません')
  return character
}

/** 部隊作成（家所属・未所属のみ。作成者が隊長） */
export async function createUnit(
  db: D1Database,
  input: { userId: string; name: string },
): Promise<Unit> {
  const character = await requireOwnedCharacter(db, input.userId)
  if (!character.houseId) throw new DomainError('家に属していないと部隊を作れません')

  const name = normalizeUnitName(input.name)
  if (name.length < 1 || name.length > 12) {
    throw new DomainError('部隊名は1〜12文字で入力してください')
  }

  const units = new UnitRepository(db)
  const existing = await units.findByMember(character.id)
  if (existing) throw new DomainError('すでに部隊に所属しています')

  const house = await new HouseRepository(db).findById(character.houseId)
  if (!house || house.destroyedAt) throw new DomainError('所属の家がありません')

  return units.create({
    id: createId(16),
    houseId: character.houseId,
    name,
    leaderCharacterId: character.id,
    createdAt: nowSeconds(),
  })
}

/** 同家の部隊に参加 */
export async function joinUnit(
  db: D1Database,
  input: { userId: string; unitId: string },
): Promise<Unit> {
  const character = await requireOwnedCharacter(db, input.userId)
  if (!character.houseId) throw new DomainError('家に属していないと部隊に入れません')

  const units = new UnitRepository(db)
  if (await units.findByMember(character.id)) {
    throw new DomainError('すでに部隊に所属しています')
  }

  const unit = await units.findById(input.unitId)
  if (!unit) throw new DomainError('部隊が見つかりません')
  if (unit.houseId !== character.houseId) {
    throw new DomainError('他家の部隊には入れません')
  }

  await units.addMember(unit.id, character.id)
  return unit
}

/** 部隊離脱。隊長なら部隊解散 */
export async function leaveUnit(
  db: D1Database,
  input: { userId: string },
): Promise<void> {
  const character = await requireOwnedCharacter(db, input.userId)
  const units = new UnitRepository(db)
  const unit = await units.findByMember(character.id)
  if (!unit) throw new DomainError('部隊に所属していません')

  if (unit.leaderCharacterId === character.id) {
    await units.delete(unit.id)
    return
  }
  await units.removeMember(character.id)
}
