import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/services/character'
import { DomainError } from '../src/services/character'
import { raiseHouse } from '../src/services/house'
import {
  appointHouseRole,
  listHouseMessages,
  listRanking,
  listRankingByHouse,
  listTitleBoards,
} from '../src/services/social'
import { listRecentWarInvasions, recordWorldEvent } from '../src/services/events'
import { ensureGameState } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'
import { CharacterRepository } from '../src/repositories/characters'
import { HouseRoleRepository } from '../src/repositories/house-roles'
import { ProvinceRepository } from '../src/repositories/provinces'
import { HOUSE_ROLES } from '../src/config/game'
import { PROVINCES } from '../src/config/provinces'
import { createId, nowSeconds } from '../src/lib/id'

async function findNeutralProvince(prefer?: string[]): Promise<string> {
  await ensureProvincesSeeded(env.DB)
  await ensureGameState(env.DB)
  const provinces = new ProvinceRepository(env.DB)
  const candidates = prefer ?? PROVINCES.map((p) => p.id)
  for (const id of candidates) {
    const p = await provinces.findById(id)
    if (p && !p.houseId) return id
  }
  throw new Error('neutral province not found')
}

async function seedHouse(provinceId: string) {
  await ensureProvincesSeeded(env.DB)
  await ensureGameState(env.DB)
  const userId = createId(12)
  await env.DB.prepare(
    `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
  )
    .bind(userId, nowSeconds(), nowSeconds())
    .run()

  const character = await createCharacter(env.DB, {
    userId,
    name: `主${createId(4)}`,
    iconId: 'busho_01',
    archetypeId: 'domestic',
    provinceId,
    buyu: '50',
    chiryaku: '50',
    toso: '50',
  })
  await raiseHouse(env.DB, { userId, houseName: `家${createId(3)}` })
  const owned = await new CharacterRepository(env.DB).findById(character.id)
  return { userId, character: owned! }
}

async function seedRetainer(provinceId: string, houseId: string) {
  const userId = createId(12)
  await env.DB.prepare(
    `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
  )
    .bind(userId, nowSeconds(), nowSeconds())
    .run()
  const character = await createCharacter(env.DB, {
    userId,
    name: `臣${createId(4)}`,
    iconId: 'busho_03',
    archetypeId: 'strategy',
    provinceId,
    buyu: '50',
    chiryaku: '50',
    toso: '50',
  })
  const now = nowSeconds()
  await new CharacterRepository(env.DB).assignHouse(character.id, houseId, now)
  await new HouseRoleRepository(env.DB).create({
    id: createId(16),
    houseId,
    characterId: character.id,
    role: HOUSE_ROLES.retainer,
    createdAt: now,
  })
  return { userId, character }
}

describe('ranking / war map / appoint', () => {
  it('ranking rows include province troops and role', async () => {
    const provinceId = await findNeutralProvince(['owari', 'mikawa', 'ise'])
    const lord = await seedHouse(provinceId)
    await new CharacterRepository(env.DB).updateResources(lord.character.id, {
      troops: 42,
      updatedAt: nowSeconds(),
    })

    const rows = await listRanking(env.DB)
    const mine = rows.find((r) => r.characterId === lord.character.id)
    expect(mine).toBeTruthy()
    expect(mine?.provinceId).toBe(provinceId)
    expect(mine?.provinceName).toBeTruthy()
    expect(mine?.troops).toBe(42)
    expect(mine?.roleLabel).toBe(HOUSE_ROLES.lord)
    expect(mine?.houseId).toBe(lord.character.houseId)
  })

  it('groups ranking by house with officers and provinces', async () => {
    const provinceId = await findNeutralProvince(['owari', 'mikawa', 'ise'])
    const lord = await seedHouse(provinceId)
    const houseId = lord.character.houseId!
    await seedRetainer(provinceId, houseId)

    const { houses, total } = await listRankingByHouse(env.DB)
    const block = houses.find((h) => h.houseId === houseId)
    expect(block).toBeTruthy()
    expect(block?.lordName).toBe(lord.character.name)
    expect(block?.memberCount).toBeGreaterThanOrEqual(2)
    expect(block?.provinceCount).toBeGreaterThanOrEqual(1)
    expect(block?.provinceNames.length).toBe(block?.provinceCount)
    expect(total).toBeGreaterThanOrEqual(2)
  })

  it('title boards expose top entries per metric', async () => {
    const provinceId = await findNeutralProvince(['yamato', 'yamashiro', 'settsu'])
    const lord = await seedHouse(provinceId)
    await new CharacterRepository(env.DB).updateResources(lord.character.id, {
      buyu: 99,
      money: 500,
      rice: 300,
      updatedAt: nowSeconds(),
    })

    const { boards, highlight } = await listTitleBoards(env.DB)
    expect(boards.length).toBeGreaterThanOrEqual(5)
    const buyu = boards.find((b) => b.id === 'buyu')
    expect(buyu?.entries[0]?.name).toBe(lord.character.name)
    expect(highlight.some((h) => h.name.includes(lord.character.name))).toBe(true)
  })

  it('lists recent war invasions from from_province_id', async () => {
    await ensureProvincesSeeded(env.DB)
    const gameState = await ensureGameState(env.DB)
    await recordWorldEvent(env.DB, {
      year: gameState.year,
      month: gameState.month,
      channel: 'news',
      kind: 'war',
      message: '尾張から三河へ侵攻',
      provinceId: 'mikawa',
      fromProvinceId: 'owari',
      createdAt: nowSeconds(),
    })

    const arrows = await listRecentWarInvasions(env.DB, 8)
    expect(arrows.some((a) => a.fromProvinceId === 'owari' && a.toProvinceId === 'mikawa')).toBe(
      true,
    )
  })

  it('lets lord appoint strategist and demotes previous unique holder', async () => {
    const provinceId = await findNeutralProvince(['yamato', 'yamashiro', 'settsu'])
    const lord = await seedHouse(provinceId)
    const houseId = lord.character.houseId!
    const first = await seedRetainer(provinceId, houseId)
    const second = await seedRetainer(provinceId, houseId)

    const appointed = await appointHouseRole(env.DB, {
      userId: lord.userId,
      targetCharacterId: first.character.id,
      roleId: 'strategist',
    })
    expect(appointed.roleLabel).toBe(HOUSE_ROLES.strategist)

    await appointHouseRole(env.DB, {
      userId: lord.userId,
      targetCharacterId: second.character.id,
      roleId: 'strategist',
    })

    const roles = new HouseRoleRepository(env.DB)
    const firstRole = await roles.findByCharacterId(first.character.id)
    const secondRole = await roles.findByCharacterId(second.character.id)
    expect(firstRole?.role).toBe(HOUSE_ROLES.retainer)
    expect(secondRole?.role).toBe(HOUSE_ROLES.strategist)

    const { members } = await listHouseMessages(env.DB, { userId: lord.userId })
    expect(members.find((m) => m.characterId === second.character.id)?.roleLabel).toBe(
      HOUSE_ROLES.strategist,
    )
  })

  it('rejects appoint by non-lord', async () => {
    const a = await findNeutralProvince(['musashi', 'sagami', 'kai'])
    const lord = await seedHouse(a)
    const retainer = await seedRetainer(a, lord.character.houseId!)

    await expect(
      appointHouseRole(env.DB, {
        userId: retainer.userId,
        targetCharacterId: retainer.character.id,
        roleId: 'general',
      }),
    ).rejects.toBeInstanceOf(DomainError)
  })
})
