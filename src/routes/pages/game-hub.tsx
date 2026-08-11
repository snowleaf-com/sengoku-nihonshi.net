import { ProvinceMap } from '../../components/ProvinceMap'
import { SiteShell } from '../../components/SiteShell'
import { rankName } from '../../config/game'
import { getProvinceMaster, PROVINCES } from '../../config/provinces'
import { adjacentCount } from '../../domain/province/adjacency'
import type { Character, House, Province } from '../../types'

type GameHubPageProps = {
  character: Character
  province: Province
  house: House | null
  provinces: Province[]
  houses: House[]
  error?: string | null
}

export function GameHubPage({
  character,
  province,
  house,
  provinces,
  houses,
  error,
}: GameHubPageProps) {
  const master = getProvinceMaster(province.id)
  const adj = master ? adjacentCount(master, PROVINCES) : 0
  const houseById = Object.fromEntries(houses.map((h) => [h.id, h]))

  return (
    <SiteShell title={`${character.name} — 戦国日本史.net`}>
      <div class="game-layout">
        <section class="game-status">
          <h1>{character.name}</h1>
          <p class="panel-lead">
            {rankName(character.rank)} · {province.name}
            {house ? ` · ${house.name}` : ' · 浪人'}
          </p>

          {error ? <p class="hero-error">{error}</p> : null}

          <dl class="meta meta-inline">
            <div>
              <dt>所在</dt>
              <dd>
                {province.name}
                {province.houseId
                  ? `（${houseById[province.houseId]?.name ?? '他家'}）`
                  : '（中立）'}
              </dd>
            </div>
            <div>
              <dt>隣接</dt>
              <dd>{adj} か国</dd>
            </div>
            <div>
              <dt>金 / 兵</dt>
              <dd>
                {character.money} / {character.troops}
              </dd>
            </div>
            {!province.houseId ? (
              <div>
                <dt>守備兵</dt>
                <dd>{province.garrison}</dd>
              </div>
            ) : null}
          </dl>

          {!house ? (
            <form class="stack-form" method="post" action="/actions/raise-house">
              <label class="field">
                <span class="field-label">家名</span>
                <input
                  class="field-input"
                  type="text"
                  name="houseName"
                  maxlength={8}
                  required
                  placeholder="例: 葵家"
                />
              </label>
              <button type="submit" class="btn btn-primary" disabled={Boolean(province.houseId)}>
                旗揚げ
              </button>
              {province.houseId ? (
                <p class="hint">中立国にいるときだけ旗揚げできます。</p>
              ) : (
                <p class="hint">家名だけで旗揚げできる。家の色は自動で決まり、領土に塗られる。</p>
              )}
            </form>
          ) : house.leaderCharacterId === character.id ? (
            <p class="hint">
              {house.name} の当主として {province.name} を治めている。
            </p>
          ) : (
            <p class="hint">
              {house.name} に仕官し、{province.name} にいる。
            </p>
          )}

          <form method="post" action="/auth/logout" class="logout-inline">
            <button type="submit" class="btn btn-ghost">
              ログアウト
            </button>
          </form>
        </section>

        <section class="game-map-section">
          <h2>全国</h2>
          <ProvinceMap
            provinces={provinces}
            houses={houses}
            focusProvinceId={character.provinceId}
          />
        </section>
      </div>
    </SiteShell>
  )
}
