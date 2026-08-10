import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { areAdjacent, adjacentCount } from '../src/domain/province/adjacency'
import { PROVINCES, getProvinceMaster } from '../src/config/provinces'
import { createCharacter } from '../src/services/character'
import { raiseHouse } from '../src/services/house'
import { ensureProvincesSeeded } from '../src/services/world'
import { UserRepository } from '../src/repositories/users'
import { createId, nowSeconds } from '../src/lib/id'
import { ProvinceRepository } from '../src/repositories/provinces'
import { CharacterRepository } from '../src/repositories/characters'

describe('province adjacency', () => {
  it('connects Shinano and Kozuke', () => {
    const shinano = getProvinceMaster('shinano')!
    const kozuke = getProvinceMaster('kozuke')!
    expect(areAdjacent(shinano, kozuke)).toBe(true)
  })

  it('does not treat a province as adjacent to itself', () => {
    const suruga = getProvinceMaster('suruga')!
    expect(areAdjacent(suruga, suruga)).toBe(false)
  })

  it('computes adjacentCount from the board', () => {
    const musashi = getProvinceMaster('musashi')!
    expect(adjacentCount(musashi, PROVINCES)).toBeGreaterThan(2)
  })
})

describe('Phase 1 world flow', () => {
  it('seeds neutral provinces from master', async () => {
    await ensureProvincesSeeded(env.DB)
    const provinces = new ProvinceRepository(env.DB)
    const all = await provinces.listAll()
    expect(all.length).toBe(PROVINCES.length)
    expect(all.every((p) => p.houseId === null)).toBe(true)
  })

  it('creates a character and raises a house on a neutral province', async () => {
    await ensureProvincesSeeded(env.DB)
    const users = new UserRepository(env.DB)
    const userId = createId()
    await users.create(userId, nowSeconds())

    const neutrals = await new ProvinceRepository(env.DB).listNeutral()
    const start = neutrals[0]
    expect(start).toBeTruthy()

    const character = await createCharacter(env.DB, {
      userId,
      name: `武将${userId.slice(0, 4)}`,
      provinceId: start.id,
    })
    expect(character.provinceId).toBe(start.id)
    expect(character.houseId).toBeNull()

    const { house } = await raiseHouse(env.DB, {
      userId,
      houseName: `家${userId.slice(0, 3)}`,
    })

    const characters = new CharacterRepository(env.DB)
    const updated = await characters.findById(character.id)
    const province = await new ProvinceRepository(env.DB).findById(character.provinceId)

    expect(house.leaderCharacterId).toBe(character.id)
    expect(updated?.houseId).toBe(house.id)
    expect(province?.houseId).toBe(house.id)
  })
})
