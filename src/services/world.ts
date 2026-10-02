import { STARTING_LOYALTY } from '../config/game'
import { marketBandForTier } from '../config/net'
import {
  getProvinceMaster,
  initialStats,
  NEUTRAL_GARRISON,
  PROVINCES,
} from '../config/provinces'
import { nowSeconds } from '../lib/id'
import { ProvinceRepository } from '../repositories/provinces'

/** マスターを単一の真実とし、空の provinces テーブルへ中立国を流し込む。 */
export async function ensureProvincesSeeded(db: D1Database): Promise<void> {
  const provinces = new ProvinceRepository(db)
  const count = await provinces.count()
  if (count === 0) {
    const createdAt = nowSeconds()
    await provinces.insertMany(
      PROVINCES.map((master) => {
        const stats = initialStats(master)
        return {
          id: master.id,
          name: master.name,
          population: stats.population,
          populationMax: stats.populationCap,
          agriculture: stats.agriculture,
          agricultureMax: stats.agricultureCap,
          commerce: stats.commerce,
          commerceMax: stats.commerceCap,
          defense: stats.defense,
          defenseMax: stats.defenseCap,
          garrison: NEUTRAL_GARRISON,
          loyalty: STARTING_LOYALTY,
          tech: 0,
          marketRate: marketBandForTier(master.commerceTier).center,
          createdAt,
        }
      }),
    )
    return
  }

  // 普請で上限を個別に上げるようになったら、この上書きは初期投入だけに戻す。
  await syncProvinceCaps(provinces)
}

/** 既存盤面の上限だけをマスターへ合わせる。現在値は触らない。 */
async function syncProvinceCaps(provinces: ProvinceRepository): Promise<void> {
  const updatedAt = nowSeconds()
  const rows = await provinces.listAll()
  for (const row of rows) {
    const master = getProvinceMaster(row.id)
    if (!master) continue
    const stats = initialStats(master)
    if (
      row.populationMax === stats.populationCap &&
      row.agricultureMax === stats.agricultureCap &&
      row.commerceMax === stats.commerceCap &&
      row.defenseMax === stats.defenseCap
    ) {
      continue
    }
    await provinces.updateCaps(row.id, {
      populationMax: stats.populationCap,
      agricultureMax: stats.agricultureCap,
      commerceMax: stats.commerceCap,
      defenseMax: stats.defenseCap,
      updatedAt,
    })
  }
}
