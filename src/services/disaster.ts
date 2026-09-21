/**
 * 災厄イベント（1月・7月の季節処理で発動）。
 * 全国一律。式は MVP 寄せ。
 */

export type DisasterType =
  | 'locust'
  | 'flood'
  | 'plague'
  | 'bumper'
  | 'quake'
  | 'boom'

export const DISASTER_TYPES: DisasterType[] = [
  'locust',
  'flood',
  'plague',
  'bumper',
  'quake',
  'boom',
]

export const DISASTER_CHANCE = 1 / 40

export const DISASTER_LABELS: Record<DisasterType, string> = {
  locust: 'いなご',
  flood: '洪水',
  plague: '疫病',
  bumper: '豊作',
  quake: '地震',
  boom: '好景気',
}

export type DisasterProvinceStats = {
  agriculture: number
  agricultureMax: number
  commerce: number
  commerceMax: number
  defense: number
  defenseMax: number
  population: number
  populationMax: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 1都市分の災厄効果（純関数・テスト用） */
export function applyDisasterToProvince(
  province: DisasterProvinceStats,
  type: DisasterType,
): DisasterProvinceStats {
  const next = { ...province }
  switch (type) {
    case 'locust':
      next.agriculture = clamp(
        Math.floor(next.agriculture * 0.8),
        0,
        next.agricultureMax,
      )
      break
    case 'flood':
      next.agriculture = clamp(Math.floor(next.agriculture * 0.9), 0, next.agricultureMax)
      next.commerce = clamp(Math.floor(next.commerce * 0.9), 0, next.commerceMax)
      next.defense = clamp(Math.floor(next.defense * 0.9), 0, next.defenseMax)
      break
    case 'plague':
      next.population = clamp(Math.floor(next.population * 0.8), 0, next.populationMax)
      break
    case 'bumper':
      next.agriculture = clamp(Math.floor(next.agriculture * 1.2), 0, next.agricultureMax)
      break
    case 'quake':
      next.agriculture = clamp(Math.floor(next.agriculture * 0.8), 0, next.agricultureMax)
      next.commerce = clamp(Math.floor(next.commerce * 0.8), 0, next.commerceMax)
      next.defense = clamp(Math.floor(next.defense * 0.8), 0, next.defenseMax)
      next.population = clamp(Math.floor(next.population * 0.9), 0, next.populationMax)
      break
    case 'boom':
      next.commerce = clamp(Math.floor(next.commerce * 1.1), 0, next.commerceMax)
      next.population = clamp(Math.floor(next.population * 1.1), 0, next.populationMax)
      break
  }
  return next
}

/** 発動判定（chance 既定 1/40） */
export function shouldTriggerDisaster(
  random01: number = Math.random(),
  chance: number = DISASTER_CHANCE,
): boolean {
  return random01 < chance
}

export function pickDisasterType(
  random01: number = Math.random(),
): DisasterType {
  const index = Math.min(
    DISASTER_TYPES.length - 1,
    Math.floor(Math.max(0, Math.min(1, random01)) * DISASTER_TYPES.length),
  )
  return DISASTER_TYPES[index]!
}
