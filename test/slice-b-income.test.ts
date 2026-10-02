import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { marketBandForTier } from '../src/config/net'
import { createId, nowSeconds } from '../src/lib/id'
import { CharacterRepository } from '../src/repositories/characters'
import { GameStateRepository } from '../src/repositories/game-state'
import { ProvinceRepository } from '../src/repositories/provinces'
import { createCharacter } from '../src/services/character'
import { listActionResults, listWorldNews } from '../src/services/events'
import { advanceDueTurns, ensureGameState } from '../src/services/turns'
import { ensureProvincesSeeded } from '../src/services/world'

async function seedUser(name: string, provinceId: string) {
  const userId = createId(12)
  const now = nowSeconds()
  await env.DB.prepare(
    `INSERT INTO users (id, created_at, updated_at, last_login_at) VALUES (?, ?, ?, NULL)`,
  )
    .bind(userId, now, now)
    .run()
  const character = await createCharacter(env.DB, {
    userId,
    name,
    iconId: 'busho_01',
    archetypeId: 'domestic',
    provinceId,
  })
  return character
}

describe('slice B seasonal income', () => {
  it('withholds pay without country merit, pays contributors, and announces promotion', async () => {
    await ensureProvincesSeeded(env.DB)
    const state = await ensureGameState(env.DB)
    const now = nowSeconds()
    await new GameStateRepository(env.DB).save({
      date: { year: state.year, month: 12 },
      turnIndex: state.turnIndex,
      nextTurnAt: state.nextTurnAt,
      updatedAt: now,
    })

    const trainer = await seedUser(`鍛${createId(4)}`, 'yamashiro')
    const contributor = await seedUser(`貢${createId(4)}`, 'owari')
    const characters = new CharacterRepository(env.DB)
    await characters.updateResources(trainer.id, {
      merit: 20,
      countryMerit: 0,
      classPoints: 490,
      rank: 1,
      updatedAt: now,
    })
    await characters.updateResources(contributor.id, {
      merit: 100,
      countryMerit: 100,
      classPoints: 0,
      updatedAt: now,
    })

    await advanceDueTurns(env.DB, { force: true, now })

    const trained = await characters.findById(trainer.id)
    expect(trained?.money).toBe(trainer.money)
    expect(trained?.merit).toBe(0)
    expect(trained?.countryMerit).toBe(0)
    expect(trained?.classPoints).toBe(510)
    expect(trained?.rank).toBe(2)
    expect(trained!.buyu + trained!.chiryaku + trained!.toso).toBe(
      trainer.buyu + trainer.chiryaku + trainer.toso + 1,
    )

    const paid = await characters.findById(contributor.id)
    expect(paid?.money).toBe(contributor.money + 1000)
    expect(paid?.rank).toBe(1)
    expect(paid?.countryMerit).toBe(0)

    const trainerResults = await listActionResults(env.DB, trainer.id)
    expect(trainerResults.some((event) => event.message.includes('支給されなかった'))).toBe(true)
    expect(trainerResults.some((event) => event.message.includes('昇進'))).toBe(true)

    const contributorResults = await listActionResults(env.DB, contributor.id)
    expect(contributorResults.some((event) => event.message.includes('税金として'))).toBe(true)

    const news = await listWorldNews(env.DB)
    expect(
      news.some(
        (event) => event.message.includes(trainer.name) && event.message.includes('昇進'),
      ),
    ).toBe(true)

    const owari = await new ProvinceRepository(env.DB).findById('owari')
    const band = marketBandForTier('A')
    expect(owari!.marketRate).toBeGreaterThanOrEqual(band.min)
    expect(owari!.marketRate).toBeLessThanOrEqual(band.max)
  })
})
