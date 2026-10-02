import { describe, expect, it } from 'vitest'
import { nextMarketRate } from '../src/services/commands'
import { rankName } from '../src/config/game'

describe('Slice B: economy', () => {
  it('nextMarketRate swings wider for S-tier commerce', () => {
    const sSwing = Math.abs(nextMarketRate(1, 'S', 1, 0) - 1)
    const cSwing = Math.abs(nextMarketRate(1, 'C', 1, 0) - 1)
    expect(sSwing).toBeGreaterThan(cSwing)
  })

  it('rankName covers promotion labels', () => {
    expect(rankName(1)).toBe('無名')
    expect(rankName(2)).toBe('郷民')
  })
})
