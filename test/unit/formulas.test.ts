/**
 * 壊れやすい純関数だけを薄く固定する（D1不要）。
 */
import { describe, expect, it } from 'vitest'
import { calcAttackPower, resolveBattle, wallDefender } from '../../src/services/battle'
import {
  applyLoyaltyPopulationDelta,
  characterIncomeShare,
  houseIncomePool,
} from '../../src/services/commands'
import {
  applyDisasterToProvince,
  pickDisasterType,
  shouldTriggerDisaster,
} from '../../src/services/disaster'
import { nextIdleStreakAfterNashi, shouldDeleteForIdle } from '../../src/services/idle'
import { netStatGainWithRandom } from '../../src/config/net'
import type { Province } from '../../src/types'

function stubProvince(overrides: Partial<Province> = {}): Province {
  return {
    id: 'x',
    name: 'x',
    houseId: null,
    population: 5000,
    populationMax: 30000,
    agriculture: 500,
    agricultureMax: 750,
    commerce: 500,
    commerceMax: 750,
    defense: 100,
    defenseMax: 150,
    garrison: 0,
    loyalty: 50,
    tech: 0,
    marketRate: 1,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('unit: battle formulas', () => {
  it('calcAttackPower matches NET integer division', () => {
    expect(calcAttackPower(80, 60)).toBe(7)
    expect(calcAttackPower(30, 60)).toBe(0)
  })

  it('resolveBattle respects fixed rng and empty defender', () => {
    expect(
      resolveBattle(
        { troops: 10, buyu: 50, training: 0 },
        { troops: 0, buyu: 50, training: 0 },
        () => 0.5,
      ).winner,
    ).toBe('attacker')

    let i = 0
    const rng = () => [1, 0, 1, 0, 1][i++] ?? 0.5
    const walls = wallDefender(40)
    const lost = resolveBattle(
      { troops: 1, buyu: 10, training: 0 },
      { troops: walls.troops, buyu: walls.buyu, training: walls.training },
      rng,
    )
    expect(['attacker', 'defender']).toContain(lost.winner)
  })
})

describe('unit: economy and loyalty', () => {
  it('houseIncomePool and salary share cap like NET', () => {
    const pool = houseIncomePool([stubProvince({ commerce: 500, population: 10000 })], 'tax')
    expect(pool).toBe(4000)
    expect(characterIncomeShare(4000, 100, 100, 0)).toBe(1000)
    expect(characterIncomeShare(4000, 0, 100, 0)).toBe(0)
  })

  it('loyalty population delta uses NET floors', () => {
    expect(applyLoyaltyPopulationDelta(stubProvince({ loyalty: 50 }))).toBe(500)
    expect(applyLoyaltyPopulationDelta(stubProvince({ loyalty: 40, population: 1000 }))).toBe(
      -800,
    )
  })

  it('netStatGainWithRandom is deterministic', () => {
    expect(netStatGainWithRandom(40, 0)).toBe(2)
    expect(netStatGainWithRandom(40, 1)).toBe(3)
  })
})

describe('unit: disaster and idle', () => {
  it('applies locust and plague multipliers', () => {
    const base = {
      agriculture: 100,
      agricultureMax: 200,
      commerce: 100,
      commerceMax: 200,
      defense: 100,
      defenseMax: 200,
      population: 1000,
      populationMax: 30000,
    }
    expect(applyDisasterToProvince(base, 'locust').agriculture).toBe(80)
    expect(applyDisasterToProvince(base, 'plague').population).toBe(800)
  })

  it('disaster trigger and pick are rng-driven', () => {
    expect(shouldTriggerDisaster(0)).toBe(true)
    expect(shouldTriggerDisaster(0.9)).toBe(false)
    expect(pickDisasterType(0)).toBe('locust')
  })

  it('idle streak hits delete threshold at 60', () => {
    expect(nextIdleStreakAfterNashi(59)).toBe(60)
    expect(shouldDeleteForIdle(59)).toBe(false)
    expect(shouldDeleteForIdle(60)).toBe(true)
  })
})
