import { GameSubpageShell } from '../../components/GameSocialNav'
import { SiteShell } from '../../components/SiteShell'
import { rankName } from '../../config/game'
import type { RankingRow } from '../../types'

type RankingPageProps = {
  rows: RankingRow[]
}

export function RankingPage({ rows }: RankingPageProps) {
  return (
    <SiteShell title="武将一覧 — 戦国日本史.net">
      <GameSubpageShell title="武将一覧" active="ranking">
        <section class="game-panel">
          <p class="hint">貢献の多い順。同点は階級値。</p>
          <div class="ranking-table-wrap">
            <table class="ranking-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>名前</th>
                  <th>家</th>
                  <th>武勇</th>
                  <th>知略</th>
                  <th>統率</th>
                  <th>徳望</th>
                  <th>貢献</th>
                  <th>官位</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} class="hint">
                      まだ武将がいない
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr>
                      <td>{i + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.houseName ?? '浪人'}</td>
                      <td>{row.buyu}</td>
                      <td>{row.chiryaku}</td>
                      <td>{row.toso}</td>
                      <td>{row.tokubo}</td>
                      <td>{row.merit}</td>
                      <td>{rankName(row.rank)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </GameSubpageShell>
    </SiteShell>
  )
}
