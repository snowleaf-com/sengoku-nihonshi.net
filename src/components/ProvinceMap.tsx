import { mapBounds, PROVINCE_BY_ID } from '../config/provinces'
import type { House, Province } from '../types'

const NEUTRAL_COLOR = '#6e6e6e'

type ProvinceMapViewProps = {
  mode?: 'view'
  provinces: Province[]
  houses: House[]
  focusProvinceId?: string
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

  return (
    <div
      class={`province-map${pickMode ? ' is-pick' : ''}`}
      style={`--map-cols:${width};--map-rows:${height};--preview-color:${previewColor ?? NEUTRAL_COLOR}`}
      aria-label={pickMode ? '初期位置を選ぶ全国マップ' : '令制国マップ'}
    >
      {cells.map((cell) => {
        if (!cell.province) {
          return <div class="province-cell province-cell-empty" key={cell.key} />
        }

        const house = cell.province.houseId ? houseById[cell.province.houseId] : null
        const focused = cell.province.id === focusProvinceId
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

        return (
          <div
            class={`province-cell${house ? ' is-owned' : ' is-neutral'}${focused ? ' is-focus' : ''}`}
            key={cell.key}
            style={`background-color:${fill}`}
            title={
              house
                ? `${cell.province.name}（${house.name}）`
                : `${cell.province.name}（中立・守備${cell.province.garrison}）`
            }
          >
            <span class="province-name">{cell.province.name}</span>
            <span class="province-owner">{house ? house.name : '中立'}</span>
          </div>
        )
      })}
    </div>
  )
}
