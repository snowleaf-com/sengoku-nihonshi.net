import { CommandPanel } from '../../components/CommandPanel'
import { EventFeed } from '../../components/EventFeed'
import { ExGauge } from '../../components/ExGauge'
import { ProvinceMap } from '../../components/ProvinceMap'
import { SiteShell } from '../../components/SiteShell'
import { StatGauge } from '../../components/StatGauge'
import { StatIcon } from '../../components/StatIcon'
import { getArchetype } from '../../config/archetypes'
import { formatGameDate, seasonLabel, seasonOfMonth } from '../../config/calendar'
import { formatMoney, formatRice, rankName } from '../../config/game'
import { getCharacterIcon, iconPublicPath } from '../../config/icons'
import { getProvinceMaster, PROVINCES } from '../../config/provinces'
import { adjacentCount } from '../../domain/province/adjacency'
import type {
  Character,
  CharacterCommand,
  GameState,
  House,
  Province,
  WorldEvent,
} from '../../types'

type GameHubPageProps = {
  character: Character
  province: Province
  house: House | null
  provinces: Province[]
  houses: House[]
  gameState: GameState
  queue: CharacterCommand[]
  news: WorldEvent[]
  results: WorldEvent[]
  commandError?: string | null
  error?: string | null
}

function softMax(value: number, floor: number): number {
  return Math.max(floor, value)
}

export function GameHubPage({
  character,
  province,
  house,
  provinces,
  houses,
  gameState,
  queue,
  news,
  results,
  commandError = null,
  error,
}: GameHubPageProps) {
  const master = getProvinceMaster(province.id)
  const adj = master ? adjacentCount(master, PROVINCES) : 0
  const houseById = Object.fromEntries(houses.map((h) => [h.id, h]))
  const icon = getCharacterIcon(character.iconId)
  const archetype = getArchetype(character.archetypeId)
  const timeFmt: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }
  const nextTurnLabel = new Date(gameState.nextTurnAt * 1000).toLocaleString('ja-JP', timeFmt)
  const nowLabel = new Date().toLocaleString('ja-JP', timeFmt)
  const locationLabel = province.houseId
    ? `${province.name}（${houseById[province.houseId]?.name ?? '他家'}）`
    : `${province.name}（中立）`
  const houseLine = !house
    ? '浪人'
    : house.leaderCharacterId === character.id
      ? `${house.name} の当主`
      : `${house.name} の家臣`
  const ownedProvinces = house
    ? provinces.filter((p) => p.houseId === house.id).length
    : 0
  const season = seasonOfMonth(gameState.month)

  return (
    <SiteShell title={`${character.name} — 戦国日本史.net`}>
      <div class="game-layout" data-season={season}>
        <header class="game-top">
          <dl class="meta meta-inline game-top-meta">
            <div>
              <dt>年月</dt>
              <dd>
                {formatGameDate(gameState)}
                <span class="season-chip">{seasonLabel(season)}</span>
              </dd>
            </div>
            <div>
              <dt>次ターン</dt>
              <dd>{nextTurnLabel}</dd>
            </div>
            <div>
              <dt>現在</dt>
              <dd>{nowLabel}</dd>
            </div>
          </dl>

          <div class="game-top-actions">
            <a class="btn btn-ghost btn-small" href="/game">
              更新
            </a>
            <form method="post" action="/actions/advance-turn">
              <button type="submit" class="btn btn-ghost btn-small">
                ターン進行
              </button>
            </form>
            <form method="post" action="/auth/logout">
              <button type="submit" class="btn btn-ghost btn-small">
                ログアウト
              </button>
            </form>
          </div>
        </header>

        {error ? <p class="hero-error game-error">{error}</p> : null}

        <div class="game-board">
          <div class="game-info-stack">
            <section class="game-panel game-card game-card-self">
              <div class="self-identity">
                <img
                  class="character-portrait"
                  src={iconPublicPath(character.iconId)}
                  alt=""
                  width="64"
                  height="64"
                />
                <div>
                  <h2 class="card-title self-name">{character.name}</h2>
                  <p class="self-meta">
                    {icon?.label ?? '武将'} · {archetype?.label ?? '均衡'} ·{' '}
                    {rankName(character.rank)}
                  </p>
                  <p class="self-meta">{houseLine}</p>
                </div>
              </div>

              <dl class="meta meta-inline card-meta">
                <div>
                  <dt>所在</dt>
                  <dd>{locationLabel}</dd>
                </div>
                <div>
                  <dt>隣接</dt>
                  <dd>{adj} か国</dd>
                </div>
              </dl>

              <dl class="ability-list">
                <div>
                  <dt>
                    <StatIcon target="buyu" />
                    武勇
                  </dt>
                  <dd>{character.buyu}</dd>
                  <ExGauge value={character.buyuEx} tone="buyu" />
                </div>
                <div>
                  <dt>
                    <StatIcon target="chiryaku" />
                    知略
                  </dt>
                  <dd>{character.chiryaku}</dd>
                  <ExGauge value={character.chiryakuEx} tone="chiryaku" />
                </div>
                <div>
                  <dt>
                    <StatIcon target="toso" />
                    統率
                  </dt>
                  <dd>{character.toso}</dd>
                  <ExGauge value={character.tosoEx} tone="toso" />
                </div>
                <div>
                  <dt>
                    <StatIcon target="tokubo" />
                    徳望
                  </dt>
                  <dd>{character.tokubo}</dd>
                  <ExGauge value={character.tokuboEx} tone="tokubo" />
                </div>
              </dl>
              <dl class="resource-list">
                <div>
                  <dt>
                    <StatIcon target="money" />
                    金
                  </dt>
                  <dd>{formatMoney(character.money)}</dd>
                </div>
                <div>
                  <dt>
                    <StatIcon target="rice" />
                    米
                  </dt>
                  <dd>{formatRice(character.rice)}</dd>
                </div>
              </dl>
              <div class="gauge-grid card-gauges">
                <StatGauge
                  label="兵"
                  value={character.troops}
                  max={softMax(character.toso, 1)}
                  sub={`上限 統率 ${character.toso}`}
                  tone="toso"
                  icon={<StatIcon target="troops" />}
                />
              </div>
            </section>

            <section class="game-panel game-card game-card-city">
              <h2 class="card-title">都市 · {province.name}</h2>
              <div class="gauge-grid gauge-grid-2">
                <StatGauge
                  label="農民"
                  value={province.population}
                  max={softMax(province.population, 10000)}
                  tone="loyalty"
                  icon={<StatIcon target="population" />}
                />
                <StatGauge
                  label="農業"
                  value={province.agriculture}
                  max={softMax(province.agriculture, 200)}
                  tone="agri"
                  icon={<StatIcon target="agriculture" />}
                />
                <StatGauge
                  label="商業"
                  value={province.commerce}
                  max={softMax(province.commerce, 200)}
                  tone="commerce"
                  icon={<StatIcon target="commerce" />}
                />
                <StatGauge
                  label="民忠"
                  value={province.loyalty}
                  max={100}
                  tone="loyalty"
                  icon={<StatIcon target="loyalty" />}
                />
              </div>
            </section>

            <section class="game-panel game-card game-card-nation">
              <h2 class="card-title">国 · {house ? house.name : '無所属'}</h2>
              {house ? (
                <>
                  <dl class="meta meta-inline card-meta">
                    <div>
                      <dt>領土</dt>
                      <dd>{ownedProvinces} か国</dd>
                    </div>
                    <div>
                      <dt>役</dt>
                      <dd>{houseLine}</dd>
                    </div>
                  </dl>
                  <p class="hint">国庫の金・米はこれから。</p>
                </>
              ) : (
                <form class="stack-form game-found-form" method="post" action="/actions/raise-house">
                  <p class="hint">所属なし。中立国なら旗揚げできる。</p>
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
                  <button
                    type="submit"
                    class="btn btn-primary"
                    disabled={Boolean(province.houseId)}
                  >
                    旗揚げ
                  </button>
                </form>
              )}
            </section>
          </div>

          <section class="game-panel game-map-section">
            <h2>全国</h2>
            <ProvinceMap
              compact
              provinces={provinces}
              houses={houses}
              focusProvinceId={character.provinceId}
            />
            <EventFeed title="出来事" events={news} empty="まだ知らせはない" />
          </section>

          <section class="game-panel game-commands">
            <CommandPanel
              queue={queue}
              currentYear={gameState.year}
              currentMonth={gameState.month}
              results={results}
              error={commandError}
            />
          </section>
        </div>
      </div>
    </SiteShell>
  )
}
