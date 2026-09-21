import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/services/character'
import { DomainError } from '../src/services/character'
import { raiseHouse } from '../src/services/house'
import {
  listHouseMessages,
  listRanking,
  postHouseMessage,
  sendLetter,
  updateHouseLaw,
} from '../src/services/social'
import { ensureGameState } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'
import { CharacterRepository } from '../src/repositories/characters'
import { HouseRepository } from '../src/repositories/houses'
import { ProvinceRepository } from '../src/repositories/provinces'
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

async function seedAt(provinceId: string, houseName?: string) {
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
    name: `社${createId(4)}`,
    iconId: 'busho_01',
    archetypeId: 'domestic',
    provinceId,
    buyu: '50',
    chiryaku: '50',
    toso: '50',
  })
  await raiseHouse(env.DB, { userId, houseName: houseName ?? `家${createId(3)}` })
  const owned = await new CharacterRepository(env.DB).findById(character.id)
  return { userId, character: owned! }
}

async function seedRonin(provinceId: string) {
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
    name: `浪${createId(4)}`,
    iconId: 'busho_02',
    archetypeId: 'battle',
    provinceId,
    buyu: '50',
    chiryaku: '50',
    toso: '50',
  })
  return { userId, character }
}

describe('phase N5 social', () => {
  it('posts house message for members', async () => {
    const provinceId = await findNeutralProvince()
    const { userId, character } = await seedAt(provinceId)

    const posted = await postHouseMessage(env.DB, {
      userId,
      body: '  今日は内政を進めよ  ',
    })
    expect(posted.body).toBe('今日は内政を進めよ')
    expect(posted.authorName).toBe(character.name)

    const { messages } = await listHouseMessages(env.DB, { userId })
    expect(messages.some((m) => m.id === posted.id)).toBe(true)
  })

  it('rejects outsider from house council', async () => {
    const a = await findNeutralProvince(['musashi', 'sagami', 'kai'])
    const b = await findNeutralProvince(
      PROVINCES.map((p) => p.id).filter((id) => id !== a),
    )
    await seedAt(a, `甲${createId(2)}`)
    const outsider = await seedRonin(b)

    await expect(
      postHouseMessage(env.DB, { userId: outsider.userId, body: '潜入' }),
    ).rejects.toBeInstanceOf(DomainError)

    await expect(
      listHouseMessages(env.DB, { userId: outsider.userId }),
    ).rejects.toBeInstanceOf(DomainError)
  })

  it('allows lord to update house law only', async () => {
    const provinceId = await findNeutralProvince()
    const lord = await seedAt(provinceId)
    const houseId = lord.character.houseId!

    const updated = await updateHouseLaw(env.DB, {
      userId: lord.userId,
      lawText: '無断出陣を禁ず',
    })
    expect(updated.lawText).toBe('無断出陣を禁ず')

    const house = await new HouseRepository(env.DB).findById(houseId)
    expect(house?.lawText).toBe('無断出陣を禁ず')

    // 同家の家臣を作成
    const retainerUserId = createId(12)
    await env.DB.prepare(
      `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
    )
      .bind(retainerUserId, nowSeconds(), nowSeconds())
      .run()
    const retainer = await createCharacter(env.DB, {
      userId: retainerUserId,
      name: `臣${createId(4)}`,
      iconId: 'busho_03',
      archetypeId: 'strategy',
      provinceId,
      buyu: '50',
      chiryaku: '50',
      toso: '50',
    })
    await new CharacterRepository(env.DB).assignHouse(
      retainer.id,
      houseId,
      nowSeconds(),
    )

    await expect(
      updateHouseLaw(env.DB, {
        userId: retainerUserId,
        lawText: '家臣が書き換え',
      }),
    ).rejects.toThrow(/当主/)
  })

  it('sends personal letter', async () => {
    const a = await findNeutralProvince(['owari', 'mikawa', 'ise'])
    const b = await findNeutralProvince(
      PROVINCES.map((p) => p.id).filter((id) => id !== a),
    )
    const from = await seedAt(a)
    const to = await seedRonin(b)

    const letter = await sendLetter(env.DB, {
      userId: from.userId,
      toCharacterId: to.character.id,
      body: '連携しよう',
    })
    expect(letter.toCharacterId).toBe(to.character.id)
    expect(letter.body).toBe('連携しよう')
  })

  it('ranking returns rows sorted by merit then class_points', async () => {
    const a = await findNeutralProvince(['yamato', 'yamashiro', 'settsu'])
    const b = await findNeutralProvince(
      PROVINCES.map((p) => p.id).filter((id) => id !== a),
    )
    const low = await seedAt(a)
    const high = await seedAt(b)
    const characters = new CharacterRepository(env.DB)
    const now = nowSeconds()
    await characters.updateResources(low.character.id, {
      merit: 10,
      classPoints: 1000,
      updatedAt: now,
    })
    await characters.updateResources(high.character.id, {
      merit: 50,
      classPoints: 0,
      updatedAt: now,
    })

    const rows = await listRanking(env.DB)
    expect(rows.length).toBeGreaterThanOrEqual(2)
    const highIdx = rows.findIndex((r) => r.characterId === high.character.id)
    const lowIdx = rows.findIndex((r) => r.characterId === low.character.id)
    expect(highIdx).toBeGreaterThanOrEqual(0)
    expect(lowIdx).toBeGreaterThanOrEqual(0)
    expect(highIdx).toBeLessThan(lowIdx)
  })
})
