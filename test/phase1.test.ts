import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { areAdjacent, adjacentCount } from '../src/domain/province/adjacency'
import { PROVINCES, getProvinceMaster } from '../src/config/provinces'
import { enterWorld } from '../src/services/enter-world'
import { ensureProvincesSeeded } from '../src/services/world'
import { UserRepository } from '../src/repositories/users'
import { createId, nowSeconds } from '../src/lib/id'
import { ProvinceRepository } from '../src/repositories/provinces'
import { CharacterRepository } from '../src/repositories/characters'
import { HOUSE_ROLES } from '../src/config/game'
import { HouseRoleRepository } from '../src/repositories/house-roles'

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

  it('founds a house when entering on a neutral province', async () => {
    await ensureProvincesSeeded(env.DB)
    const users = new UserRepository(env.DB)
    const userId = createId()
    await users.create(userId, nowSeconds())

    const neutrals = await new ProvinceRepository(env.DB).listNeutral()
    const start = neutrals[0]
    expect(start).toBeTruthy()

    const result = await enterWorld(env.DB, {
      userId,
      name: `武将${userId.slice(0, 4)}`,
      iconId: 'busho_01',
      archetypeId: 'battle',
      provinceId: start.id,
      houseName: `家${userId.slice(0, 3)}`,
    })

    expect(result.path).toBe('found')
    expect(result.house.leaderCharacterId).toBe(result.character.id)
    expect(result.character.houseId).toBe(result.house.id)
    expect(result.character.archetypeId).toBe('battle')
    expect(result.character.buyu).toBe(80)
    expect(result.character.tokubo).toBe(25)

    const province = await new ProvinceRepository(env.DB).findById(start.id)
    expect(province?.houseId).toBe(result.house.id)
  })

  it('enlists when entering on an owned province', async () => {
    await ensureProvincesSeeded(env.DB)
    const users = new UserRepository(env.DB)
    const lordId = createId()
    const retainerId = createId()
    await users.create(lordId, nowSeconds())
    await users.create(retainerId, nowSeconds())

    const neutrals = await new ProvinceRepository(env.DB).listNeutral()
    const start = neutrals[0]

    const founded = await enterWorld(env.DB, {
      userId: lordId,
      name: `主${lordId.slice(0, 4)}`,
      iconId: 'busho_02',
      archetypeId: 'domestic',
      provinceId: start.id,
      houseName: `家${lordId.slice(0, 3)}`,
    })
    expect(founded.path).toBe('found')

    const enlisted = await enterWorld(env.DB, {
      userId: retainerId,
      name: `臣${retainerId.slice(0, 4)}`,
      iconId: 'busho_03',
      archetypeId: 'command',
      provinceId: start.id,
    })

    expect(enlisted.path).toBe('enlist')
    expect(enlisted.character.houseId).toBe(founded.house.id)
    expect(enlisted.house.id).toBe(founded.house.id)
    expect(enlisted.house.leaderCharacterId).toBe(founded.character.id)

    const roles = new HouseRoleRepository(env.DB)
    const role = await roles.findByCharacterId(enlisted.character.id)
    expect(role?.role).toBe(HOUSE_ROLES.retainer)

    const characters = new CharacterRepository(env.DB)
    const lord = await characters.findById(founded.character.id)
    expect(lord?.houseId).toBe(founded.house.id)
  })
})
