import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { POPULATION_MAX } from '../src/config/net'
import {
  CITY_RANK_LABEL,
  cityRankOf,
  getProvinceMaster,
  GREAT_CITY_IDS,
  initialStats,
  isPortProvince,
  PORT_PROVINCE_IDS,
  troopCapForCity,
} from '../src/config/provinces'
import { ProvinceRepository } from '../src/repositories/provinces'
import { ensureProvincesSeeded } from '../src/services/world'

describe('city rank and ports', () => {
  it('assigns the planned great cities and keeps Kinai from all being great', () => {
    expect(GREAT_CITY_IDS).toHaveLength(10)
    expect(cityRankOf(getProvinceMaster('settsu')!)).toBe('great')
    expect(cityRankOf(getProvinceMaster('sagami')!)).toBe('great')
    expect(cityRankOf(getProvinceMaster('yamashiro')!)).toBe('mid')
    expect(cityRankOf(getProvinceMaster('yamato')!)).toBe('town')
    expect(CITY_RANK_LABEL.great).toBe('大都市')
  })

  it('marks ports without treating Kazusa as one', () => {
    expect(isPortProvince(getProvinceMaster('shima')!)).toBe(true)
    expect(isPortProvince(getProvinceMaster('awa_kanto')!)).toBe(true)
    expect(isPortProvince(getProvinceMaster('kazusa')!)).toBe(false)
    expect(isPortProvince(getProvinceMaster('echizen')!)).toBe(true)
    expect(PORT_PROVINCE_IDS).toContain('tosa')
  })

  it('raises caps and recruit room only for mid and great cities', () => {
    const town = initialStats(getProvinceMaster('yamato')!)
    const mid = initialStats(getProvinceMaster('yamashiro')!)
    const great = initialStats(getProvinceMaster('settsu')!)
    expect(town.populationCap).toBe(POPULATION_MAX)
    expect(mid.populationCap).toBe(Math.floor(POPULATION_MAX * 1.05))
    expect(great.populationCap).toBe(Math.floor(POPULATION_MAX * 1.1))
    expect(town.agricultureCap).toBe(Math.floor(500 * 1.5))
    expect(great.commerceCap).toBeGreaterThan(town.commerceCap)
    expect(troopCapForCity(100, 'town')).toBe(100)
    expect(troopCapForCity(100, 'mid')).toBe(105)
    expect(troopCapForCity(100, 'great')).toBe(110)
  })

  it('syncs stored caps without rewriting current agriculture', async () => {
    await ensureProvincesSeeded(env.DB)
    const repo = new ProvinceRepository(env.DB)
    const before = await repo.findById('settsu')
    expect(before).not.toBeNull()
    await env.DB.prepare(
      `UPDATE provinces SET population_max = 1, agriculture = 123 WHERE id = ?`,
    )
      .bind('settsu')
      .run()

    await ensureProvincesSeeded(env.DB)
    const after = await repo.findById('settsu')
    expect(after?.populationMax).toBe(Math.floor(POPULATION_MAX * 1.1))
    expect(after?.agriculture).toBe(123)
    expect(after?.population).toBe(before?.population)
  })
})
