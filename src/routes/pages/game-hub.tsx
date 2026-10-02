import { CommandPanel } from '../../components/CommandPanel'
import { EventFeed } from '../../components/EventFeed'
import { ExGauge } from '../../components/ExGauge'
import {
  HouseOfficersPanel,
  type HouseOfficerRow,
} from '../../components/HouseOfficersPanel'
import { ProvinceMap } from '../../components/ProvinceMap'
import { QueueSummary } from '../../components/QueueSummary'
import { SiteShell } from '../../components/SiteShell'
import { StatGauge } from '../../components/StatGauge'
import { StatIcon } from '../../components/StatIcon'
import { getArchetype } from '../../config/archetypes'
import {
  formatGameDate,
  formatRealtime,
  realtimeAtQueueOffset,
  seasonLabel,
  seasonOfMonth,
} from '../../config/calendar'
import { formatQueueLabel } from '../../config/command-payload'
import { getCommand } from '../../config/commands'
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
import type { HouseMessageWithAuthor } from '../../repositories/house-messages'

type UnitSummary = {
  id: string
  name: string
  isLeader: boolean
  memberNames: string[]
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
  warInvasions?: Array<{ fromProvinceId: string; toProvinceId: string }>
  defenderName?: string | null
  commandError?: string | null
  error?: string | null
  notice?: string | null
  turnIntervalSeconds: number
  houseOfficers?: HouseOfficerRow[]
  houseBoardMessages?: HouseMessageWithAuthor[]
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
  warInvasions = [],
  defenderName = null,
  commandError = null,
  error,
  notice = null,
  turnIntervalSeconds,
  houseOfficers = [],
  houseBoardMessages = [],
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
  const nextQueued = [...queue].sort((a, b) => a.position - b.position)[0] ?? null
  const nextCommandLabel = nextQueued
    ? formatQueueLabel(
        nextQueued.commandId,
        nextQueued.payload,
        getCommand(nextQueued.commandId)?.label ?? nextQueued.commandId,
        (id) => provinceNameById[id] ?? null,
        (id) => characterNameById[id] ?? null,
      )
    : 'なし'
  const nextCommandRealtime = nextQueued
    ? formatRealtime(
        realtimeAtQueueOffset(gameState.nextTurnAt, nextQueued.position, turnIntervalSeconds),
      )
    : null

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
              <dt>次ターンまで</dt>
              <dd>
                <span
                  class="turn-countdown"
                  data-next-turn-at={String(gameState.nextTurnAt)}
                >
                  —
                </span>
                <span class="hint-inline">{nextTurnLabel}</span>
              </dd>
            </div>
            <div>
              <dt>次コマンド</dt>
              <dd>
                <strong class="next-command-label">{nextCommandLabel}</strong>
                {nextCommandRealtime ? (
                  <span class="hint-inline">{nextCommandRealtime}</span>
                ) : null}
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
              全国の知らせ{newsCount > 0 ? ` (${newsCount})` : ''}
            </a>
            <a class="btn btn-ghost btn-small btn-touch" href="/game/house">
              作戦会議
            </a>
            <a class="btn btn-ghost btn-small btn-touch" href="/game/letters">
              手紙
            </a>
            <a class="btn btn-ghost btn-small btn-touch" href="/game/ranking">
              武将一覧
            </a>
            <a class="btn btn-ghost btn-small btn-touch" href="/game/titles">
              名将一覧
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

        {character.defending ? (
          <p class="vital-flag-banner">守備中</p>
        ) : null}

        {gameState.maintenance ? (
          <p class="hero-error game-error">メンテナンス中です。コマンドの入力はできません。</p>
        ) : null}
        {error ? <p class="hero-error game-error">{error}</p> : null}
        {notice ? <p class="hint game-notice">{notice}</p> : null}

        <div class="game-board">
          <div class="game-info-stack">
            <details class="game-panel game-card game-card-self game-card-disclosure" open>
              <summary class="card-title self-summary">自身</summary>
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
                  <dt>
                    <StatIcon target="merit" />
                    国貢献
                  </dt>
                  <dd>{character.countryMerit}</dd>
                </div>
                <div>
                  <dt>忠誠</dt>
                  <dd>{character.loyalty}</dd>
                </div>
              </dl>
              <p class="hint">国貢献が0の半期は、税金・年貢は支給されない。</p>
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
            </details>

            <details class="game-panel game-card game-card-city game-card-disclosure" open>
              <summary class="card-title">都市 · {province.name}</summary>
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
            </details>

            <details class="game-panel game-card game-card-nation game-card-disclosure" open>
              <summary class="card-title">国 · {house ? house.name : '無所属'}</summary>
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
                  {unit ? (
                    <p class="status-badge">
                      部隊「{unit.name}」{unit.isLeader ? '（隊長）' : ''}
                      <a class="hint-inline" href="/game/house">
                        作戦会議で編成
                      </a>
                    </p>
                  ) : (
                    <p class="hint">
                      部隊の編成は
                      <a href="/game/house">作戦会議</a>
                      で行う。
                    </p>
                  )}
                  {houseBoardMessages.length > 0 ? (
                    <div class="hub-board-preview">
                      <h3 class="unit-block-title">掲示板</h3>
                      <ul class="hub-board-list">
                        {houseBoardMessages.slice(0, 3).map((m) => (
                          <li class="hub-board-item" key={m.id}>
                            <strong>{m.authorName}</strong>
                            <span>{m.body}</span>
                          </li>
                        ))}
                      </ul>
                      <a class="btn btn-ghost btn-small" href="/game/house">
                        作戦会議へ
                      </a>
                    </div>
                  ) : (
                    <p class="hint">
                      家の掲示板は
                      <a href="/game/house">作戦会議</a>
                      で確認・投稿できる。
                    </p>
                  )}
                  <HouseOfficersPanel
                    officers={houseOfficers}
                    currentYear={gameState.year}
                    currentMonth={gameState.month}
                    nextTurnAt={gameState.nextTurnAt}
                    turnIntervalSeconds={turnIntervalSeconds}
                    provinceNameById={provinceNameById}
                    characterNameById={characterNameById}
                  />
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
            </details>
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
                title="全国の知らせ"
                subtitle="戦・災・収入・人事など、全国向けの出来事"
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
              nextTurnAt={gameState.nextTurnAt}
              turnIntervalSeconds={turnIntervalSeconds}
              provinceNameById={provinceNameById}
              characterNameById={characterNameById}
            />
            <div class="command-fab-bar">
              <button type="button" class="btn btn-primary btn-touch" data-open-commands>
                コマンド
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
                nextTurnAt={gameState.nextTurnAt}
                turnIntervalSeconds={turnIntervalSeconds}
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
