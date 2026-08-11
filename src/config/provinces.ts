/**
 * 令制国マスター（ゲーム盤）。
 * 史実の正確な海岸線より、隣接と立地のゲーム性を優先した圧縮配置。
 * 隣接は座標の8方向で判定する（src/domain/province/adjacency.ts）。
 */

export type ProvinceId = string

export type ProvinceTier = 'S' | 'A' | 'B' | 'C'

export type ProvinceMaster = {
  id: ProvinceId
  name: string
  /** 東へ大きい */
  x: number
  /** 南へ大きい（画面上は上が北） */
  y: number
  populationTier: ProvinceTier
  agricultureTier: ProvinceTier
  commerceTier: ProvinceTier
  defenseTier: ProvinceTier
}

/** tier → 初期値。上限は初期値の 1.5 倍を runtime で付与する。 */
export const TIER_BASE: Record<ProvinceTier, number> = {
  S: 900,
  A: 700,
  B: 500,
  C: 350,
}

/** 中立国の守備兵（仕様例に合わせた初期値） */
export const NEUTRAL_GARRISON = 4000

/**
 * 全国盤面（圧縮版）。
 * 西日本は広め、甲信越〜関東〜東北は圧縮。信濃↔上野などが8方向で接するようにする。
 */
export const PROVINCES: ProvinceMaster[] = [
  // 東北・北関東（圧縮）
  { id: 'dewa', name: '出羽', x: 12, y: 0, populationTier: 'B', agricultureTier: 'B', commerceTier: 'C', defenseTier: 'B' },
  { id: 'mutsu', name: '陸奥', x: 13, y: 0, populationTier: 'A', agricultureTier: 'B', commerceTier: 'C', defenseTier: 'B' },
  { id: 'echigo', name: '越後', x: 11, y: 1, populationTier: 'A', agricultureTier: 'A', commerceTier: 'B', defenseTier: 'B' },
  { id: 'kozuke', name: '上野', x: 12, y: 1, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'shimotsuke', name: '下野', x: 13, y: 1, populationTier: 'B', agricultureTier: 'B', commerceTier: 'C', defenseTier: 'C' },
  { id: 'hitachi', name: '常陸', x: 14, y: 1, populationTier: 'A', agricultureTier: 'A', commerceTier: 'B', defenseTier: 'C' },

  // 甲信越・関東
  { id: 'shinano', name: '信濃', x: 11, y: 2, populationTier: 'A', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'A' },
  { id: 'kai', name: '甲斐', x: 12, y: 2, populationTier: 'B', agricultureTier: 'C', commerceTier: 'B', defenseTier: 'A' },
  { id: 'musashi', name: '武蔵', x: 13, y: 2, populationTier: 'S', agricultureTier: 'A', commerceTier: 'S', defenseTier: 'B' },
  { id: 'shimousa', name: '下総', x: 14, y: 2, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'C' },
  { id: 'kazusa', name: '上総', x: 14, y: 3, populationTier: 'B', agricultureTier: 'B', commerceTier: 'C', defenseTier: 'C' },
  { id: 'awa_kanto', name: '安房', x: 14, y: 4, populationTier: 'C', agricultureTier: 'C', commerceTier: 'C', defenseTier: 'B' },
  { id: 'sagami', name: '相模', x: 13, y: 3, populationTier: 'B', agricultureTier: 'B', commerceTier: 'A', defenseTier: 'B' },
  { id: 'izu', name: '伊豆', x: 13, y: 4, populationTier: 'C', agricultureTier: 'C', commerceTier: 'B', defenseTier: 'B' },

  // 東海・北陸
  { id: 'etchu', name: '越中', x: 10, y: 1, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'C' },
  { id: 'noto', name: '能登', x: 9, y: 0, populationTier: 'C', agricultureTier: 'C', commerceTier: 'B', defenseTier: 'B' },
  { id: 'kaga', name: '加賀', x: 9, y: 1, populationTier: 'B', agricultureTier: 'B', commerceTier: 'A', defenseTier: 'B' },
  { id: 'echizen', name: '越前', x: 8, y: 1, populationTier: 'B', agricultureTier: 'A', commerceTier: 'B', defenseTier: 'B' },
  { id: 'hida', name: '飛騨', x: 10, y: 2, populationTier: 'C', agricultureTier: 'C', commerceTier: 'C', defenseTier: 'A' },
  { id: 'mino', name: '美濃', x: 9, y: 2, populationTier: 'A', agricultureTier: 'A', commerceTier: 'A', defenseTier: 'B' },
  { id: 'suruga', name: '駿河', x: 12, y: 3, populationTier: 'A', agricultureTier: 'A', commerceTier: 'A', defenseTier: 'B' },
  { id: 'totomi', name: '遠江', x: 11, y: 3, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'mikawa', name: '三河', x: 10, y: 3, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'owari', name: '尾張', x: 9, y: 3, populationTier: 'A', agricultureTier: 'A', commerceTier: 'A', defenseTier: 'B' },
  { id: 'ise', name: '伊勢', x: 9, y: 4, populationTier: 'B', agricultureTier: 'A', commerceTier: 'B', defenseTier: 'C' },
  { id: 'iga', name: '伊賀', x: 8, y: 3, populationTier: 'C', agricultureTier: 'C', commerceTier: 'C', defenseTier: 'A' },
  { id: 'shima', name: '志摩', x: 9, y: 5, populationTier: 'C', agricultureTier: 'C', commerceTier: 'B', defenseTier: 'C' },

  // 近畿
  { id: 'omi', name: '近江', x: 8, y: 2, populationTier: 'A', agricultureTier: 'A', commerceTier: 'A', defenseTier: 'B' },
  { id: 'yamashiro', name: '山城', x: 7, y: 2, populationTier: 'A', agricultureTier: 'B', commerceTier: 'S', defenseTier: 'B' },
  { id: 'yamato', name: '大和', x: 7, y: 3, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'kawachi', name: '河内', x: 6, y: 3, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'izumi', name: '和泉', x: 6, y: 4, populationTier: 'B', agricultureTier: 'C', commerceTier: 'A', defenseTier: 'C' },
  { id: 'settsu', name: '摂津', x: 6, y: 2, populationTier: 'A', agricultureTier: 'B', commerceTier: 'S', defenseTier: 'B' },
  { id: 'kii', name: '紀伊', x: 7, y: 4, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'tamba', name: '丹波', x: 7, y: 1, populationTier: 'B', agricultureTier: 'B', commerceTier: 'C', defenseTier: 'B' },
  { id: 'tango', name: '丹後', x: 7, y: 0, populationTier: 'C', agricultureTier: 'C', commerceTier: 'B', defenseTier: 'B' },
  { id: 'tajima', name: '但馬', x: 6, y: 0, populationTier: 'C', agricultureTier: 'C', commerceTier: 'C', defenseTier: 'B' },
  { id: 'harima', name: '播磨', x: 5, y: 2, populationTier: 'A', agricultureTier: 'A', commerceTier: 'B', defenseTier: 'B' },
  { id: 'awaji', name: '淡路', x: 5, y: 3, populationTier: 'C', agricultureTier: 'C', commerceTier: 'B', defenseTier: 'C' },

  // 山陽・山陰
  { id: 'mimasaka', name: '美作', x: 4, y: 1, populationTier: 'C', agricultureTier: 'B', commerceTier: 'C', defenseTier: 'B' },
  { id: 'bizen', name: '備前', x: 4, y: 2, populationTier: 'B', agricultureTier: 'B', commerceTier: 'A', defenseTier: 'B' },
  { id: 'bitchu', name: '備中', x: 3, y: 2, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'bingo', name: '備後', x: 2, y: 2, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'aki', name: '安芸', x: 1, y: 2, populationTier: 'B', agricultureTier: 'B', commerceTier: 'A', defenseTier: 'B' },
  { id: 'suo', name: '周防', x: 0, y: 2, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'nagato', name: '長門', x: 0, y: 1, populationTier: 'B', agricultureTier: 'C', commerceTier: 'B', defenseTier: 'A' },
  { id: 'inaba', name: '因幡', x: 5, y: 0, populationTier: 'C', agricultureTier: 'C', commerceTier: 'C', defenseTier: 'B' },
  { id: 'hoki', name: '伯耆', x: 4, y: 0, populationTier: 'C', agricultureTier: 'B', commerceTier: 'C', defenseTier: 'B' },
  { id: 'izumo', name: '出雲', x: 3, y: 0, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'iwami', name: '石見', x: 2, y: 1, populationTier: 'C', agricultureTier: 'C', commerceTier: 'A', defenseTier: 'B' },

  // 四国
  { id: 'awa_shikoku', name: '阿波', x: 4, y: 3, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'sanuki', name: '讃岐', x: 3, y: 3, populationTier: 'B', agricultureTier: 'A', commerceTier: 'B', defenseTier: 'C' },
  { id: 'iyo', name: '伊予', x: 2, y: 3, populationTier: 'A', agricultureTier: 'A', commerceTier: 'B', defenseTier: 'B' },
  { id: 'tosa', name: '土佐', x: 3, y: 4, populationTier: 'B', agricultureTier: 'B', commerceTier: 'C', defenseTier: 'A' },

  // 九州
  { id: 'buzen', name: '豊前', x: 0, y: 3, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'chikuzen', name: '筑前', x: 0, y: 4, populationTier: 'A', agricultureTier: 'B', commerceTier: 'A', defenseTier: 'B' },
  { id: 'chikugo', name: '筑後', x: 1, y: 4, populationTier: 'B', agricultureTier: 'A', commerceTier: 'B', defenseTier: 'C' },
  { id: 'bungo', name: '豊後', x: 1, y: 3, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'B' },
  { id: 'hizen', name: '肥前', x: 0, y: 5, populationTier: 'A', agricultureTier: 'B', commerceTier: 'A', defenseTier: 'B' },
  { id: 'higo', name: '肥後', x: 1, y: 5, populationTier: 'A', agricultureTier: 'A', commerceTier: 'B', defenseTier: 'B' },
  { id: 'hyuga', name: '日向', x: 2, y: 5, populationTier: 'B', agricultureTier: 'B', commerceTier: 'C', defenseTier: 'B' },
  { id: 'osumi', name: '大隅', x: 2, y: 6, populationTier: 'C', agricultureTier: 'C', commerceTier: 'C', defenseTier: 'B' },
  { id: 'satsuma', name: '薩摩', x: 1, y: 6, populationTier: 'B', agricultureTier: 'B', commerceTier: 'B', defenseTier: 'A' },
]

export const PROVINCE_BY_ID: Record<string, ProvinceMaster> = Object.fromEntries(
  PROVINCES.map((p) => [p.id, p]),
)

export function getProvinceMaster(id: ProvinceId): ProvinceMaster | null {
  return PROVINCE_BY_ID[id] ?? null
}

export function mapBounds(provinces: ProvinceMaster[] = PROVINCES) {
  let maxX = 0
  let maxY = 0
  for (const p of provinces) {
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { maxX, maxY, width: maxX + 1, height: maxY + 1 }
}

export function initialStats(master: ProvinceMaster) {
  const population = TIER_BASE[master.populationTier]
  const agriculture = TIER_BASE[master.agricultureTier]
  const commerce = TIER_BASE[master.commerceTier]
  const defense = TIER_BASE[master.defenseTier]
  return {
    population,
    agriculture,
    commerce,
    defense,
    populationCap: Math.floor(population * 1.5),
    agricultureCap: Math.floor(agriculture * 1.5),
    commerceCap: Math.floor(commerce * 1.5),
    defenseCap: Math.floor(defense * 1.5),
  }
}
