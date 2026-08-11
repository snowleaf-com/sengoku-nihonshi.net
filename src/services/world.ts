import {
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
  if (count > 0) return

  const createdAt = nowSeconds()
  await provinces.insertMany(
    PROVINCES.map((master) => {
      const stats = initialStats(master)
      return {
        id: master.id,
        name: master.name,
        population: stats.population,
        agriculture: stats.agriculture,
        commerce: stats.commerce,
        defense: stats.defense,
        garrison: NEUTRAL_GARRISON,
        createdAt,
      }
    }),
  )
}
