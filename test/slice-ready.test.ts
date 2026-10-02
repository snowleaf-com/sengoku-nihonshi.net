import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { HOUSE_ROLES } from '../src/config/game'
import { createId, nowSeconds } from '../src/lib/id'
import { CharacterCommandRepository } from '../src/repositories/character-commands'
import { CharacterRepository } from '../src/repositories/characters'
import { HouseRoleRepository } from '../src/repositories/house-roles'
import { ProvinceRepository } from '../src/repositories/provinces'
import { createCharacter } from '../src/services/character'
import { DomainError } from '../src/services/character'
import {
  applyCommandPreset,
  listCommandPresetViews,
  saveCommandPreset,
} from '../src/services/command-presets'
import { raiseHouse } from '../src/services/house'
import { appointHouseRole, exileHouseMember } from '../src/services/social'
import { ensureGameState } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'
import { PROVINCES } from '../src/config/provinces'

async function findNeutralProvince(): Promise<string> {
  await ensureProvincesSeeded(env.DB)
  await ensureGameState(env.DB)
  const provinces = new ProvinceRepository(env.DB)
  for (const master of PROVINCES) {
    const province = await provinces.findById(master.id)
    if (province && !province.houseId) return master.id
  }
  throw new Error('neutral province not found')
}

async function insertUser(): Promise<string> {
  const userId = createId(12)
  const now = nowSeconds()
  await env.DB.prepare(
    `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
  )
    .bind(userId, now, now)
    .run()
  return userId
}

async function seedLord(provinceId: string) {
  const userId = await insertUser()
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

async function seedMember(provinceId: string, houseId: string, role: string) {
  const userId = await insertUser()
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
    role,
    createdAt: now,
  })
  return { userId, character }
}

describe('exile', () => {
  it('lets the lord or strategist exile a retainer, and refuses the lord', async () => {
    const provinceId = await findNeutralProvince()
    const lord = await seedLord(provinceId)
    const houseId = lord.character.houseId!
    const strategist = await seedMember(provinceId, houseId, HOUSE_ROLES.retainer)
    const retainer = await seedMember(provinceId, houseId, HOUSE_ROLES.retainer)
    await appointHouseRole(env.DB, {
      userId: lord.userId,
      targetCharacterId: strategist.character.id,
      roleId: 'strategist',
    })

    await exileHouseMember(env.DB, {
      userId: strategist.userId,
      targetCharacterId: retainer.character.id,
    })
    const exiled = await new CharacterRepository(env.DB).findById(retainer.character.id)
    expect(exiled?.houseId).toBeNull()
    expect(await new HouseRoleRepository(env.DB).findByCharacterId(retainer.character.id)).toBeNull()

    await expect(
      exileHouseMember(env.DB, {
        userId: strategist.userId,
        targetCharacterId: lord.character.id,
      }),
    ).rejects.toThrow(/当主は追放できません/)

    const other = await seedMember(provinceId, houseId, HOUSE_ROLES.retainer)
    await expect(
      exileHouseMember(env.DB, {
        userId: other.userId,
        targetCharacterId: strategist.character.id,
      }),
    ).rejects.toBeInstanceOf(DomainError)
  })
})

describe('command presets', () => {
  it('saves selected commands and repeats them from the chosen slot', async () => {
    const provinceId = await findNeutralProvince()
    const lord = await seedLord(provinceId)
    const now = nowSeconds()
    await new CharacterCommandRepository(env.DB).enqueueMany([
      {
        id: createId(16),
        characterId: lord.character.id,
        commandId: 'nougyou',
        position: 0,
        payload: null,
        createdAt: now,
      },
      {
        id: createId(16),
        characterId: lord.character.id,
        commandId: 'shiro',
        position: 1,
        payload: null,
        createdAt: now,
      },
    ])

    await saveCommandPreset(env.DB, {
      userId: lord.userId,
      slot: 1,
      name: '内政',
      positions: ['0', '1'],
    })
    const views = await listCommandPresetViews(env.DB, lord.character.id)
    expect(views[0]?.name).toBe('内政')
    expect(views[0]?.steps.map((step) => step.commandId)).toEqual(['nougyou', 'shiro'])
    expect(views[1]?.steps).toEqual([])

    await applyCommandPreset(env.DB, {
      userId: lord.userId,
      slot: '1',
      positions: ['0'],
    })
    const queue = await new CharacterCommandRepository(env.DB).listByCharacter(lord.character.id)
    expect(queue.slice(0, 4).map((row) => row.commandId)).toEqual([
      'nougyou',
      'shiro',
      'nougyou',
      'shiro',
    ])
  })
})
