import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { applyCommandsToPositions, executeCharacterCommand, isInHomeLand } from '../src/services/commands'
import { createCharacter } from '../src/services/character'
import { raiseHouse } from '../src/services/house'
import { ensureGameState, advanceDueTurns } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'
import { CharacterCommandRepository } from '../src/repositories/character-commands'
import { CharacterRepository } from '../src/repositories/characters'
import { ProvinceRepository } from '../src/repositories/provinces'
import { createId, nowSeconds } from '../src/lib/id'

async function seedUserCharacter(opts?: { provinceId?: string }) {
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
    name: `移${createId(4)}`,
    iconId: 'busho_01',
    archetypeId: 'domestic',
    provinceId: opts?.provinceId ?? 'yamashiro',
  })
  return { userId, character }
}

describe('phase N2 move trade shikan', () => {
  it('moves to an adjacent province and gains toso EX', async () => {
    const { userId, character } = await seedUserCharacter({ provinceId: 'yamashiro' })
    // 山城の隣接に近江など
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'idou',
      positions: [0],
      payload: { kind: 'move', provinceId: 'omi' },
    })

    const queued = await new CharacterCommandRepository(env.DB).listByCharacter(character.id)
    expect(queued[0]?.payload).toContain('omi')

    const { advanced } = await advanceDueTurns(env.DB, { force: true })
    expect(advanced).toBe(1)

    const after = await new CharacterRepository(env.DB).findById(character.id)
    expect(after?.provinceId).toBe('omi')
    expect(after?.tosoEx).toBe(1)
  })

  it('rejects move to non-adjacent province', async () => {
    const { userId, character } = await seedUserCharacter({ provinceId: 'yamashiro' })
    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'idou',
      positions: [0],
      payload: { kind: 'move', provinceId: 'satsuma' },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const result = await executeCharacterCommand(env.DB, character, queued)
    expect(result.ok).toBe(false)
  })

  it('trades rice for gold at reserved market rate', async () => {
    const { userId, character } = await seedUserCharacter({ provinceId: 'higo' })
    await raiseHouse(env.DB, { userId, houseName: `家${createId(3)}` })
    const owned = await new CharacterRepository(env.DB).findById(character.id)
    expect(owned?.houseId).toBeTruthy()

    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'beibai',
      positions: [0],
      payload: { kind: 'trade', side: 'sell_rice', amount: 100, marketRate: 1.0 },
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const before = await new CharacterRepository(env.DB).findById(character.id)
    const result = await executeCharacterCommand(env.DB, before!, queued)
    expect(result.ok).toBe(true)
    const after = await new CharacterRepository(env.DB).findById(character.id)
    expect(after?.rice).toBe((before?.rice ?? 0) - 100)
    expect(after?.money).toBe((before?.money ?? 0) + 100)
    expect(after?.chiryakuEx).toBe(1)
  })

  it('blocks domestic commands outside home land', async () => {
    const { userId, character } = await seedUserCharacter({ provinceId: 'tosa' })
    await raiseHouse(env.DB, { userId, houseName: `国${createId(3)}` })
    // 支配していない国へ出て内政
    await new CharacterRepository(env.DB).updateProvince(character.id, 'musashi', nowSeconds())
    const moved = await new CharacterRepository(env.DB).findById(character.id)
    const musashi = await new ProvinceRepository(env.DB).findById('musashi')
    expect(isInHomeLand(moved!, musashi!)).toBe(false)

    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'nougyou',
      positions: [0],
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const result = await executeCharacterCommand(env.DB, moved!, queued)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('自国以外')
  })

  it('allows ronin to enlist via shikan command', async () => {
    const { userId, character } = await seedUserCharacter({ provinceId: 'owari' })
    // 先に別ユーザーが建国して支配
    const lordUser = createId(12)
    await env.DB.prepare(
      `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
    )
      .bind(lordUser, nowSeconds(), nowSeconds())
      .run()
    await createCharacter(env.DB, {
      userId: lordUser,
      name: `主${createId(3)}`,
      iconId: 'busho_02',
      archetypeId: 'battle',
      provinceId: 'mino',
    })
    await raiseHouse(env.DB, { userId: lordUser, houseName: `織${createId(2)}` })
    const lord = await new CharacterRepository(env.DB).findByUserId(lordUser)
    const mino = await new ProvinceRepository(env.DB).findById('mino')
    expect(mino?.houseId).toBe(lord?.houseId)

    await new CharacterRepository(env.DB).updateProvince(character.id, 'mino', nowSeconds())
    const ronin = await new CharacterRepository(env.DB).findById(character.id)
    expect(ronin?.houseId).toBeNull()

    await applyCommandsToPositions(env.DB, {
      userId,
      commandId: 'shikan',
      positions: [0],
    })
    const queued = (await new CharacterCommandRepository(env.DB).listByCharacter(character.id))[0]!
    const result = await executeCharacterCommand(env.DB, ronin!, queued)
    expect(result.ok).toBe(true)
    const after = await new CharacterRepository(env.DB).findById(character.id)
    expect(after?.houseId).toBe(lord?.houseId)
  })
})
