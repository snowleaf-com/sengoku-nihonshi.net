import { mapBounds, PROVINCE_BY_ID } from '../config/provinces'
import type { House, Province } from '../types'

const NEUTRAL_COLOR = '#6e6e6e'

export type WarInvasionArrow = {
  fromProvinceId: string
  toProvinceId: string
}

type ProvinceMapViewProps = {
  mode?: 'view'
  provinces: Province[]
  houses: House[]
  focusProvinceId?: string
  /** Hub向け: 都市名と色だけ・小さめ表示 */
  compact?: boolean
  /** 戦争の攻撃候補など、地図上で強調する国 */
  highlightProvinceIds?: string[]
  /** 最近の侵攻方向（from→to） */
  warInvasions?: WarInvasionArrow[]
}

type ProvinceMapPickProps = {
  mode: 'pick'
  provinces: Province[]
  houses: House[]
  /** 中立選択時に塗る家色（プレビュー） */
  previewColor: string
  inputName?: string
  /** HTMX: 選択時に差し替えるターゲット */
  pickSwapTarget?: string
  /** HTMX: 選択時の fragment URL（?provinceId= を付与） */
  pickSwapPath?: string
}

type ProvinceMapProps = ProvinceMapViewProps | ProvinceMapPickProps

export function ProvinceMap(props: ProvinceMapProps) {
  const { width, height } = mapBounds()
  const houseById = Object.fromEntries(props.houses.map((h) => [h.id, h]))
  const byId = Object.fromEntries(props.provinces.map((p) => [p.id, p]))
  const mastersByCoord = new Map(
    Object.values(PROVINCE_BY_ID).map((p) => [`${p.x},${p.y}`, p]),
  )
  const pickMode = props.mode === 'pick'
  const previewColor = pickMode ? props.previewColor : null
  const inputName = pickMode ? (props.inputName ?? 'provinceId') : null
  const pickSwapTarget = pickMode ? props.pickSwapTarget : undefined
  const pickSwapPath = pickMode ? props.pickSwapPath : undefined
  const focusProvinceId = !pickMode ? props.focusProvinceId : undefined
  const compact = !pickMode && props.compact === true
  const highlightIds = new Set(
    !pickMode && props.highlightProvinceIds ? props.highlightProvinceIds : [],
  )
  const warInvasions = !pickMode && props.warInvasions ? props.warInvasions : []
  const invasionFromIds = new Set(warInvasions.map((a) => a.fromProvinceId))
  const invasionToIds = new Set(warInvasions.map((a) => a.toProvinceId))

  const cells: Array<{ key: string; province: Province | null }> = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const master = mastersByCoord.get(`${x},${y}`)
      cells.push({
        key: `${x}-${y}`,
        province: master ? (byId[master.id] ?? null) : null,
      })
    }
  }

  const arrowLines = warInvasions
    .map((arrow) => {
      const from = PROVINCE_BY_ID[arrow.fromProvinceId]
      const to = PROVINCE_BY_ID[arrow.toProvinceId]
      if (!from || !to) return null
      return {
        key: `${arrow.fromProvinceId}-${arrow.toProvinceId}`,
        x1: ((from.x + 0.5) / width) * 100,
        y1: ((from.y + 0.5) / height) * 100,
        x2: ((to.x + 0.5) / width) * 100,
        y2: ((to.y + 0.5) / height) * 100,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row != null)

  return (
    <div
      class={`province-map${pickMode ? ' is-pick' : ''}${compact ? ' is-compact' : ''}`}
      style={`--map-cols:${width};--map-rows:${height};--preview-color:${previewColor ?? NEUTRAL_COLOR}`}
      aria-label={pickMode ? '初期位置を選ぶ全国マップ' : '令制国マップ'}
    >
      {cells.map((cell) => {
        if (!cell.province) {
          return <div class="province-cell province-cell-empty" key={cell.key} />
        }

        const house = cell.province.houseId ? houseById[cell.province.houseId] : null
        const focused = cell.province.id === focusProvinceId
        const highlighted = highlightIds.has(cell.province.id)
        const invasionFrom = invasionFromIds.has(cell.province.id)
        const invasionTo = invasionToIds.has(cell.province.id)
        const fill = house?.color ?? NEUTRAL_COLOR

        if (pickMode && inputName) {
          const title = house
            ? `${cell.province.name}（${house.name}・クリックで仕官）`
            : `${cell.province.name}（中立・クリックで建国）`

          const hxGet =
            pickSwapPath && pickSwapTarget
              ? `${pickSwapPath}?provinceId=${encodeURIComponent(cell.province.id)}`
              : undefined

          return (
            <label
              class={`province-cell is-selectable${house ? ' is-owned' : ' is-neutral'}`}
              key={cell.key}
              style={`background-color:${fill}`}
              title={title}
            >
              <input
                class="province-pick-input"
                type="radio"
                name={inputName}
                value={cell.province.id}
                required
                {...(hxGet
                  ? {
                      'hx-get': hxGet,
                      'hx-target': pickSwapTarget,
                      'hx-trigger': 'change',
                      'hx-swap': 'innerHTML',
                    }
                  : {})}
              />
              <span class="province-name">{cell.province.name}</span>
              <span class="province-owner">{house ? house.name : '中立'}</span>
            </label>
          )
        }

        const extras: string[] = []
        if (highlighted) extras.push('攻撃可')
        if (invasionFrom) extras.push('出兵')
        if (invasionTo) extras.push('侵攻先')

        return (
          <div
            class={`province-cell${house ? ' is-owned' : ' is-neutral'}${focused ? ' is-focus' : ''}${highlighted ? ' is-war-target' : ''}${invasionFrom ? ' is-war-from' : ''}${invasionTo ? ' is-war-to' : ''}`}
            key={cell.key}
            style={`background-color:${fill}`}
            title={
              house
                ? `${cell.province.name}（${house.name}${extras.length ? `・${extras.join('・')}` : ''}）`
                : `${cell.province.name}（中立${extras.length ? `・${extras.join('・')}` : ''}）`
            }
          >
            <span class="province-name">{cell.province.name}</span>
            {compact ? null : (
              <span class="province-owner">{house ? house.name : '中立'}</span>
            )}
          </div>
        )
      })}

      {arrowLines.length > 0 ? (
        <svg
          class="province-map-arrows"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="war-arrowhead"
              markerWidth="5"
              markerHeight="5"
              refX="4"
              refY="2.5"
              orient="auto"
            >
              <path d="M0,0 L5,2.5 L0,5 Z" fill="#c45c26" />
            </marker>
          </defs>
          {arrowLines.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              marker-end="url(#war-arrowhead)"
            />
          ))}
        </svg>
      ) : null}
    </div>
  )
}
