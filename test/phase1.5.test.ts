import { describe, expect, it } from 'vitest'
import {
  ADJUSTABLE_STAT_TOTAL,
  ARCHETYPES,
  defaultStatsForArchetype,
  isArchetypeId,
  resolveCharacterStats,
  STAT_MAX,
  STAT_MIN,
} from '../src/config/archetypes'

describe('archetype stats', () => {
  it('lists four playstyles', () => {
    expect(ARCHETYPES.map((a) => a.id)).toEqual([
      'battle',
      'domestic',
      'strategy',
      'command',
    ])
    expect(isArchetypeId('command')).toBe(true)
    expect(isArchetypeId('balanced')).toBe(false)
  })

  it('uses NET-like 5〜100 range and total 150', () => {
    expect(STAT_MIN).toBe(5)
    expect(STAT_MAX).toBe(100)
    for (const archetype of ARCHETYPES) {
      const stats = defaultStatsForArchetype(archetype.id)
      expect(stats.buyu + stats.chiryaku + stats.toso).toBe(ADJUSTABLE_STAT_TOTAL)
      expect(stats.tokubo).toBe(archetype.tokubo)
    }
  })

  it('battle dumps into buyu and toso; strategy keeps buyu low', () => {
    const battle = defaultStatsForArchetype('battle')
    expect(battle.chiryaku).toBe(STAT_MIN)
    expect(battle.buyu).toBeGreaterThan(battle.chiryaku)
    expect(battle.toso).toBeGreaterThan(battle.chiryaku)

    const strategy = defaultStatsForArchetype('strategy')
    expect(strategy.buyu).toBe(STAT_MIN)
    expect(strategy.chiryaku).toBeGreaterThan(strategy.buyu)
  })

  it('command dumps into toso', () => {
    const command = defaultStatsForArchetype('command')
    expect(command.toso).toBe(STAT_MAX)
    expect(command.chiryaku).toBe(STAT_MIN)
  })

  it('locks tokubo to the archetype while allowing 3-stat adjust', () => {
    const ok = resolveCharacterStats('battle', { buyu: 90, chiryaku: 5, toso: 55 })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.stats.tokubo).toBe(25)
    expect(ok.stats.buyu).toBe(90)

    const bad = resolveCharacterStats('battle', { buyu: 80, chiryaku: 40, toso: 50 })
    expect(bad.ok).toBe(false)
  })
})
