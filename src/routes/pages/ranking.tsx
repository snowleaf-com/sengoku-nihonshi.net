import { GameSubpageShell } from '../../components/GameSocialNav'
import { SiteShell } from '../../components/SiteShell'
import { rankName } from '../../config/game'
import { iconPublicPath } from '../../config/icons'
import type { HouseRankingBlock, RankingRow } from '../../types'

type RankingPageProps = {
  houses: HouseRankingBlock[]
  ronin: RankingRow[]
  total: number
}

function NationRankBadge({ rank }: { rank: number }) {
  const tone = rank <= 3 ? `is-top-${rank}` : ''
  return <span class={`nation-rank-badge ${tone}`}>{rank}</span>
}

function ProvinceChips({ names }: { names: string[] }) {
  if (names.length === 0) {
    return <p class="hint ranking-province-empty">領地なし</p>
  }
  return (
    <ul class="province-chips" aria-label="領地">
      {names.map((name) => (
        <li class="province-chip">{name}</li>
      ))}
    </ul>
  )
}

function MemberList({ rows }: { rows: RankingRow[] }) {
  if (rows.length === 0) {
    return <p class="hint">まだ武将がいない</p>
  }
  return (
    <ul class="ranking-member-list">
      {rows.map((row, i) => (
        <li class="ranking-member">
          <div class="ranking-member-main">
            <span class="ranking-member-index">{i + 1}</span>
            <img
              class="ranking-portrait"
              src={iconPublicPath(row.iconId)}
              alt=""
              width="36"
              height="36"
            />
            <div class="ranking-member-who">
              <strong class="ranking-member-name">{row.name}</strong>
              <span class="ranking-member-meta">
                {row.roleLabel ?? '家臣'} · {row.provinceName} · {rankName(row.rank)}
              </span>
            </div>
            <span class="ranking-member-troops">{row.troops}</span>
          </div>
          <div class="ranking-member-stats" aria-label="能力">
            <span>
              <abbr title="武勇">武</abbr> {row.buyu}
            </span>
            <span>
              <abbr title="知略">知</abbr> {row.chiryaku}
            </span>
            <span>
              <abbr title="統率">統</abbr> {row.toso}
            </span>
            <span>
              <abbr title="徳望">徳</abbr> {row.tokubo}
            </span>
            <span>
              <abbr title="貢献">貢</abbr> {row.merit}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function RankingPage({ houses, ronin, total }: RankingPageProps) {
  return (
    <SiteShell title="武将一覧 — 戦国日本史.net">
      <GameSubpageShell title="武将一覧" active="ranking" wide>
        <section class="game-panel ranking-panel">
          <p class="hint">
            国ごとに武将を一覧。国家順位は家臣の四能力合計。全 {total} 名。
          </p>

          {houses.length > 0 ? (
            <ol class="nation-rank-strip" aria-label="国家順位">
              {houses.map((house) => (
                <li class="nation-rank-strip-item">
                  <NationRankBadge rank={house.nationRank} />
                  <div class="nation-rank-strip-body">
                    <strong class="nation-rank-strip-name">{house.houseName}</strong>
                    <span class="nation-rank-strip-meta">
                      総合 {house.powerScore} · 領国 {house.provinceCount}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}

          <label class="field ranking-filter">
            <span class="field-label">国で絞り込み</span>
            <select class="field-input" data-ranking-filter>
              <option value="">すべて</option>
              {houses.map((h) => (
                <option value={h.houseId}>
                  {h.nationRank}. {h.houseName}
                </option>
              ))}
              {ronin.length > 0 ? <option value="__ronin__">浪人</option> : null}
            </select>
          </label>

          {houses.length === 0 && ronin.length === 0 ? (
            <p class="hint">まだ武将がいない</p>
          ) : null}

          {houses.map((house) => (
            <article class="house-ranking-block" data-house-block={house.houseId}>
              <header class="house-ranking-head">
                <div class="house-ranking-title-row">
                  <NationRankBadge rank={house.nationRank} />
                  <div>
                    <h2 class="house-ranking-title">{house.houseName}</h2>
                    <p class="house-ranking-score">
                      総合力 <strong>{house.powerScore}</strong>
                    </p>
                  </div>
                </div>
                <dl class="house-ranking-kpis">
                  <div>
                    <dt>領国</dt>
                    <dd>{house.provinceCount}</dd>
                  </div>
                  <div>
                    <dt>家臣</dt>
                    <dd>{house.memberCount}</dd>
                  </div>
                </dl>
                <p class="house-ranking-officers">
                  当主 {house.lordName ?? '—'}／軍師 {house.strategistName ?? '—'}／大将{' '}
                  {house.generalName ?? '—'}
                </p>
                <ProvinceChips names={house.provinceNames} />
              </header>
              <MemberList rows={house.members} />
            </article>
          ))}

          {ronin.length > 0 ? (
            <article class="house-ranking-block" data-house-block="__ronin__">
              <header class="house-ranking-head">
                <div class="house-ranking-title-row">
                  <span class="nation-rank-badge is-ronin">浪</span>
                  <div>
                    <h2 class="house-ranking-title">浪人</h2>
                    <p class="house-ranking-score">{ronin.length}名</p>
                  </div>
                </div>
              </header>
              <MemberList rows={ronin} />
            </article>
          ) : null}
        </section>
      </GameSubpageShell>
    </SiteShell>
  )
}
