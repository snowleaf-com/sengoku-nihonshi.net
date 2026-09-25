import { GameSubpageShell } from '../../components/GameSocialNav'
import { SiteShell } from '../../components/SiteShell'
import { rankName } from '../../config/game'
import type { HouseRankingBlock, RankingRow } from '../../types'

type RankingPageProps = {
  houses: HouseRankingBlock[]
  ronin: RankingRow[]
  total: number
}

function MemberTable({ rows }: { rows: RankingRow[] }) {
  return (
    <div class="ranking-table-wrap">
      <table class="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>名前</th>
            <th>役職</th>
            <th>所在</th>
            <th>兵</th>
            <th>官位</th>
            <th>貢献</th>
            <th>武勇</th>
            <th>知略</th>
            <th>統率</th>
            <th>徳望</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={11} class="hint">
                まだ武将がいない
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr>
                <td>{i + 1}</td>
                <td>{row.name}</td>
                <td>{row.roleLabel ?? '—'}</td>
                <td>{row.provinceName}</td>
                <td>{row.troops}</td>
                <td>{rankName(row.rank)}</td>
                <td>{row.merit}</td>
                <td>{row.buyu}</td>
                <td>{row.chiryaku}</td>
                <td>{row.toso}</td>
                <td>{row.tokubo}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function RankingPage({ houses, ronin, total }: RankingPageProps) {
  return (
    <SiteShell title="武将一覧 — 戦国日本史.net">
      <GameSubpageShell title="武将一覧" active="ranking">
        <section class="game-panel">
          <p class="hint">
            国（家）ごとに武将をまとめた一覧。領国数の多い順。全 {total} 名。
          </p>
          <label class="field ranking-filter">
            <span class="field-label">家で絞り込み</span>
            <select class="field-input" data-ranking-filter>
              <option value="">すべて</option>
              {houses.map((h) => (
                <option value={h.houseId}>{h.houseName}</option>
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
                <h2 class="house-ranking-title">{house.houseName}</h2>
                <p class="house-ranking-meta">
                  領国 {house.provinceCount}（{house.provinceNames.join('・') || 'なし'}）／家臣{' '}
                  {house.memberCount}名
                </p>
                <p class="house-ranking-officers">
                  当主 {house.lordName ?? '—'}／軍師 {house.strategistName ?? '—'}／大将{' '}
                  {house.generalName ?? '—'}
                </p>
              </header>
              <MemberTable rows={house.members} />
            </article>
          ))}

          {ronin.length > 0 ? (
            <article class="house-ranking-block" data-house-block="__ronin__">
              <header class="house-ranking-head">
                <h2 class="house-ranking-title">浪人</h2>
                <p class="house-ranking-meta">{ronin.length}名</p>
              </header>
              <MemberTable rows={ronin} />
            </article>
          ) : null}
        </section>
      </GameSubpageShell>
    </SiteShell>
  )
}
