import { CommandPanel } from '../../components/CommandPanel'
import { EventFeed } from '../../components/EventFeed'
import { ExGauge } from '../../components/ExGauge'
import { ProvinceMap } from '../../components/ProvinceMap'
import { QueueSummary } from '../../components/QueueSummary'
import { SiteShell } from '../../components/SiteShell'
import { StatGauge } from '../../components/StatGauge'
import { StatIcon } from '../../components/StatIcon'
import { getArchetype } from '../../config/archetypes'
import { formatGameDate, seasonLabel, seasonOfMonth } from '../../config/calendar'
import { formatMoney, formatRice, rankName } from '../../config/game'
import { salaryCapForClassPoints } from '../../config/net'
import { iconPublicPath } from '../../config/icons'
import { getProvinceMaster, PROVINCES } from '../../config/provinces'
import { adjacentCount, listAdjacentIds } from '../../domain/province/adjacency'
import { isInHomeLand } from '../../services/commands'
import type {
  Character,
  CharacterCommand,
  GameState,
  House,
  Province,
  WorldEvent,
} from '../../types'

type UnitSummary = {
  id: string
  name: string
  isLeader: boolean
  memberNames: string[]
}

type HouseUnitOption = {
  id: string
  name: string
}

type GameHubPageProps = {
  character: Character
  province: Province
  house: House | null
  houseRoleLabel?: string | null
  provinces: Province[]
  houses: House[]
  gameState: GameState
  queue: CharacterCommand[]
  news: WorldEvent[]
  results: WorldEvent[]
  recruitTargets: Array<{ id: string; name: string; houseLabel: string }>
  characterNameById: Record<string, string>
  unit: UnitSummary | null
  houseUnits: HouseUnitOption[]
  warInvasions?: Array<{ fromProvinceId: string; toProvinceId: string }>
  defenderName?: string | null
  commandError?: string | null
  error?: string | null
  notice?: string | null
}

function softMax(value: number, floor: number): number {
  return Math.max(floor, value)
}

export function GameHubPage({
  character,
  province,
  house,
  houseRoleLabel = null,
  provinces,
  houses,
  gameState,
  queue,
  news,
  results,
  recruitTargets,
  characterNameById,
  unit,
  houseUnits,
  warInvasions = [],
  defenderName = null,
  commandError = null,
  error,
  notice = null,
}: GameHubPageProps) {
  const master = getProvinceMaster(province.id)
  const adj = master ? adjacentCount(master, PROVINCES) : 0
  const houseById = Object.fromEntries(houses.map((h) => [h.id, h]))
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
  const locationLabel = province.houseId
    ? `${province.name}（${houseById[province.houseId]?.name ?? '他家'}）`
    : `${province.name}（中立）`
  const houseLine = !house
    ? '浪人'
    : house.leaderCharacterId === character.id
      ? `${house.name} の当主`
      : `${house.name} の${houseRoleLabel ?? '家臣'}`
  const ownedProvinces = house
    ? provinces.filter((p) => p.houseId === house.id).length
    : 0
  const season = seasonOfMonth(gameState.month)
  const inHomeLand = isInHomeLand(character, province)
  const canShikan = !character.houseId && Boolean(province.houseId)
  const adjacentProvinces = master
    ? listAdjacentIds(master, PROVINCES).map((id) => {
        const m = getProvinceMaster(id)!
        return { id: m.id, name: m.name }
      })
    : []
  const warTargets = adjacentProvinces
    .map((adj) => {
      const p = provinces.find((row) => row.id === adj.id)
      if (!p) return null
      if (character.houseId && p.houseId === character.houseId) return null
      const ownerLabel = p.houseId
        ? (houseById[p.houseId]?.name ?? '他家')
        : '中立'
      return { id: adj.id, name: adj.name, ownerLabel }
    })
    .filter((row): row is { id: string; name: string; ownerLabel: string } => row != null)
  const provinceNameById = Object.fromEntries(provinces.map((p) => [p.id, p.name]))
  const salaryCap = salaryCapForClassPoints(character.classPoints)
  const newsCount = news.length
  const resultsCount = results.length
  const latestNewsAt = news[0]?.createdAt ?? 0
  const latestResultsAt = results[0]?.createdAt ?? 0

  return (
    <SiteShell title={`${character.name} — 戦国日本史.net`}>
      <div class="game-layout">
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
              <dd>
                <span>{nextTurnLabel}</span>
                <span
                  class="turn-countdown"
                  data-next-turn-at={String(gameState.nextTurnAt)}
                  hidden
                ></span>
              </dd>
            </div>
            <div>
              <dt>現在</dt>
              <dd>
                <span data-live-clock class="live-clock">
                  —
                </span>
              </dd>
            </div>
          </dl>

          <div class="game-top-actions">
            <button type="button" class="btn btn-primary btn-small btn-touch" data-open-commands>
              コマンド
            </button>
            <a
              class="btn btn-ghost btn-small btn-touch"
              href="#feed-results"
              data-feed-badge="results"
              data-feed-latest={String(latestResultsAt)}
            >
              結果{resultsCount > 0 ? ` (${resultsCount})` : ''}
            </a>
            <a
              class="btn btn-ghost btn-small btn-touch"
              href="#feed-news"
              data-feed-badge="news"
              data-feed-latest={String(latestNewsAt)}
            >
              知らせ{newsCount > 0 ? ` (${newsCount})` : ''}
            </a>
            <a class="btn btn-ghost btn-small btn-touch" href="/game/house">
              会議室
            </a>
            <a class="btn btn-ghost btn-small btn-touch" href="/game/letters">
              手紙
            </a>
            <a class="btn btn-ghost btn-small btn-touch" href="/game/ranking">
              武将一覧
            </a>
            <a class="btn btn-ghost btn-small btn-touch" href="/game/titles">
              名称一覧
            </a>
            <a class="btn btn-ghost btn-small btn-touch" href="/game">
              更新
            </a>
            <form method="post" action="/actions/advance-turn">
              <button type="submit" class="btn btn-ghost btn-small btn-touch">
                ターン進行
              </button>
            </form>
            <form method="post" action="/auth/logout">
              <button type="submit" class="btn btn-ghost btn-small btn-touch">
                ログアウト
              </button>
            </form>
          </div>
        </header>

        <div class="vital-strip" aria-label="所持">
          <div class="vital-item">
            <span class="vital-label">金</span>
            <strong class="vital-value">{formatMoney(character.money)}</strong>
          </div>
          <div class="vital-item">
            <span class="vital-label">米</span>
            <strong class="vital-value">{formatRice(character.rice)}</strong>
          </div>
          <div class="vital-item">
            <span class="vital-label">兵</span>
            <strong class="vital-value">
              {character.troops}
              <span class="vital-sub">/{character.toso}</span>
            </strong>
          </div>
          {character.defending ? (
            <span class="vital-flag">守備中</span>
          ) : null}
        </div>

        {gameState.maintenance ? (
          <p class="hero-error game-error">メンテナンス中です。コマンドの入力はできません。</p>
        ) : null}
        {error ? <p class="hero-error game-error">{error}</p> : null}
        {notice ? <p class="hint game-notice">{notice}</p> : null}

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
                    {archetype?.label ?? '均衡'} · {rankName(character.rank)}
                    <span class="hint-inline">給与上限 {formatMoney(salaryCap)}</span>
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
              <dl class="resource-list resource-list-primary">
                <div class="is-primary">
                  <dt>
                    <StatIcon target="money" />
                    金
                  </dt>
                  <dd>{formatMoney(character.money)}</dd>
                </div>
                <div class="is-primary">
                  <dt>
                    <StatIcon target="rice" />
                    米
                  </dt>
                  <dd>{formatRice(character.rice)}</dd>
                </div>
                <div>
                  <dt>
                    <StatIcon target="merit" />
                    貢献
                  </dt>
                  <dd>{character.merit}</dd>
                </div>
                <div>
                  <dt>忠誠</dt>
                  <dd>{character.loyalty}</dd>
                </div>
              </dl>
              {unit ? (
                <p class="status-badge">
                  部隊「{unit.name}」{unit.isLeader ? '（隊長）' : ''}
                </p>
              ) : null}
              <div class="gauge-grid card-gauges">
                <StatGauge
                  label="兵"
                  value={character.troops}
                  max={softMax(character.toso, 1)}
                  sub={`上限 統率 ${character.toso}`}
                  tone="toso"
                  icon={<StatIcon target="troops" />}
                />
                <StatGauge
                  label="訓練"
                  value={character.training}
                  max={100}
                  tone="buyu"
                  icon={<StatIcon target="training" />}
                />
              </div>
              {character.defending ? (
                <p class="status-badge status-defending">あなたがこの都市を守備中</p>
              ) : null}
            </section>

            <section class="game-panel game-card game-card-city">
              <h2 class="card-title">都市 · {province.name}</h2>
              <p class="city-defend">
                都市の守備：{defenderName ? defenderName : 'なし（城壁のみ）'}
              </p>
              <div class="gauge-grid gauge-grid-2">
                <StatGauge
                  label="農民"
                  value={province.population}
                  max={province.populationMax}
                  tone="loyalty"
                  icon={<StatIcon target="population" />}
                />
                <StatGauge
                  label="農業"
                  value={province.agriculture}
                  max={province.agricultureMax}
                  tone="agri"
                  icon={<StatIcon target="agriculture" />}
                />
                <StatGauge
                  label="商業"
                  value={province.commerce}
                  max={province.commerceMax}
                  tone="commerce"
                  icon={<StatIcon target="commerce" />}
                />
                <StatGauge
                  label="城壁"
                  value={province.defense}
                  max={province.defenseMax}
                  tone="toso"
                  icon={<StatIcon target="defense" />}
                />
                <StatGauge
                  label="民忠"
                  value={province.loyalty}
                  max={100}
                  tone="loyalty"
                  icon={<StatIcon target="loyalty" />}
                />
                <StatGauge
                  label="技術"
                  value={province.tech}
                  max={999}
                  tone="chiryaku"
                  icon={<StatIcon target="tech" />}
                />
              </div>
              <p class="hint">
                相場 米100→金{Math.floor(province.marketRate * 100)} / 金100→米
                {Math.floor((2 - province.marketRate) * 100)}
              </p>
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
                  <div class="unit-block">
                    <h3 class="unit-block-title">部隊</h3>
                    <p class="hint">
                      同じ部隊の武将は集合コマンドで合流できる。隊長が部隊を作る。
                    </p>
                    <div class="unit-actions">
                      {unit ? (
                        <>
                          <p class="status-badge">
                            所属「{unit.name}」{unit.isLeader ? '（隊長）' : '（隊員）'}
                          </p>
                          {unit.memberNames.length > 0 ? (
                            <p class="hint">
                              メンバー: {unit.memberNames.join('、')}
                            </p>
                          ) : null}
                          <form method="post" action="/actions/unit-leave">
                            <button type="submit" class="btn btn-ghost btn-small">
                              部隊を離脱
                            </button>
                          </form>
                        </>
                      ) : (
                        <>
                          <p class="hint">未所属。新編するか既存部隊へ参加。</p>
                          <form class="stack-form" method="post" action="/actions/unit-create">
                            <label class="field">
                              <span class="field-label">新部隊</span>
                              <input
                                class="field-input"
                                type="text"
                                name="unitName"
                                maxlength={12}
                                required
                                placeholder="部隊名"
                              />
                            </label>
                            <button type="submit" class="btn btn-ghost btn-small">
                              編成
                            </button>
                          </form>
                          {houseUnits.length > 0 ? (
                            <form class="stack-form" method="post" action="/actions/unit-join">
                              <label class="field">
                                <span class="field-label">参加</span>
                                <select class="field-input" name="unitId" required>
                                  {houseUnits.map((u) => (
                                    <option value={u.id} key={u.id}>
                                      {u.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button type="submit" class="btn btn-ghost btn-small">
                                参加
                              </button>
                            </form>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
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

          <section class="game-panel game-map-section" data-season={season}>
            <h2>全国</h2>
            <ProvinceMap
              compact
              provinces={provinces}
              houses={houses}
              focusProvinceId={character.provinceId}
              highlightProvinceIds={warTargets.map((t) => t.id)}
              warInvasions={warInvasions}
            />
            <p class="hint">
              隣接の攻撃可能国は強調。最近の侵攻は矢印。守備は所在都市のパネルで確認。
            </p>
            <div id="feed-news">
              <EventFeed
                title="知らせ"
                events={news}
                empty="まだ知らせはない"
                filterable
              />
            </div>
            <div id="feed-results">
              <EventFeed title="あなたの結果" events={results} empty="まだ結果はない" />
            </div>
          </section>

          <div class="command-dock">
            <QueueSummary
              queue={queue}
              currentYear={gameState.year}
              currentMonth={gameState.month}
              provinceNameById={provinceNameById}
              characterNameById={characterNameById}
            />
            <div class="command-fab-bar">
              <button type="button" class="btn btn-primary btn-touch" data-open-commands>
                コマンドを開く
              </button>
            </div>
          </div>

          <dialog id="command-sheet" class="command-sheet">
            <div class="command-sheet-inner">
              <header class="command-sheet-head">
                <h2>コマンド</h2>
                <button type="button" class="btn btn-ghost btn-small btn-touch" data-close-commands>
                  閉じる
                </button>
              </header>
              <CommandPanel
                queue={queue}
                currentYear={gameState.year}
                currentMonth={gameState.month}
                results={results}
                error={commandError}
                inHomeLand={inHomeLand}
                canShikan={canShikan}
                adjacentProvinces={adjacentProvinces}
                warTargets={warTargets}
                recruitTargets={recruitTargets}
                marketRate={province.marketRate}
                provinceNameById={provinceNameById}
                characterNameById={characterNameById}
                troopCap={character.toso}
                maintenance={Boolean(gameState.maintenance)}
              />
            </div>
          </dialog>
        </div>
      </div>
    </SiteShell>
  )
}
