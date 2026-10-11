import { nowSeconds } from '../lib/id'
import { CharacterRepository } from '../repositories/characters'
import { HouseRoleRepository } from '../repositories/house-roles'
import { HouseRepository } from '../repositories/houses'
import { ProvinceRepository } from '../repositories/provinces'
import { UnitRepository } from '../repositories/units'
import type { WorldEventKind } from '../types'
import { recordWorldEvent } from './events'

type DestroyHouseNews = {
  year: number
  month: number
  message: string
  kind?: WorldEventKind
}

/**
 * 家を滅ぼす。残領土を解放し、全メンバーを浪人にする（所在は動かさない）。
 * すでに滅亡済みなら false。
 */
export async function destroyHouse(
  db: D1Database,
  houseId: string,
  options: {
    now?: number
    news?: DestroyHouseNews
    /** 各元家臣の個人結果。省略時は出さない */
    memberResultMessage?: string
    /** 領土を奪った家。帰順の礼の対象としてメンバーに残す */
    conquerorHouseId?: string
    turnIndex?: number
  } = {},
): Promise<boolean> {
  const houses = new HouseRepository(db)
  const house = await houses.findById(houseId)
  if (!house || house.destroyedAt) return false

  const now = options.now ?? nowSeconds()
  const characters = new CharacterRepository(db)
  const provinces = new ProvinceRepository(db)
  const units = new UnitRepository(db)
  const roles = new HouseRoleRepository(db)

  const owned = await provinces.listByHouseId(houseId)
  for (const province of owned) {
    await provinces.updateOwner(province.id, null, now)
  }

  const members = await characters.listByHouseId(houseId)
  for (const member of members) {
    const unit = await units.findByMember(member.id)
    if (unit) {
      if (unit.leaderCharacterId === member.id) await units.delete(unit.id)
      else await units.removeMember(member.id)
    }
    await roles.deleteByCharacterId(member.id)
    if (member.defending) {
      await characters.updateResources(member.id, { defending: 0, updatedAt: now })
    }
    await characters.assignHouse(member.id, null, now)
    if (options.conquerorHouseId && options.turnIndex != null) {
      await characters.setFallenTo(member.id, {
        houseId: options.conquerorHouseId,
        turnIndex: options.turnIndex,
        updatedAt: now,
      })
    }

    if (options.news && options.memberResultMessage) {
      await recordWorldEvent(db, {
        year: options.news.year,
        month: options.news.month,
        channel: 'result',
        kind: options.news.kind ?? 'war',
        message: options.memberResultMessage,
        characterId: member.id,
        houseId: null,
        createdAt: now,
      })
    }
  }

  await roles.deleteByHouseId(houseId)
  await houses.destroy(houseId, now)

  if (options.news) {
    await recordWorldEvent(db, {
      year: options.news.year,
      month: options.news.month,
      channel: 'news',
      kind: options.news.kind ?? 'war',
      message: options.news.message,
      houseId: null,
      createdAt: now,
    })
  }

  return true
}

/** 領国が1つもなければ滅亡する。滅亡したら true。 */
export async function destroyHouseIfLandless(
  db: D1Database,
  houseId: string,
  options: {
    now?: number
    news?: DestroyHouseNews
    memberResultMessage?: string
    conquerorHouseId?: string
    turnIndex?: number
  } = {},
): Promise<boolean> {
  const owned = await new ProvinceRepository(db).listByHouseId(houseId)
  if (owned.length > 0) return false
  return destroyHouse(db, houseId, options)
}
