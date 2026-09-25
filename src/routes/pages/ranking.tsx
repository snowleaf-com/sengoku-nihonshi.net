import { GameSubpageShell } from '../../components/GameSocialNav'
import { SiteShell } from '../../components/SiteShell'
import { rankName } from '../../config/game'
import type { RankingRow } from '../../types'

type RankingPageProps = {
  rows: RankingRow[]
}

export function RankingPage({ rows }: RankingPageProps) {
  const houses = Array.from(
    new Set(rows.map((r) => r.houseName).filter((name): name is string => Boolean(name))),
  ).sort((a, b) => a.localeCompare(b, 'ja'))

  return (
    <SiteShell title="武将一覧 — 戦国日本史.net">
      <GameSubpageShell title="武将一覧" active="ranking">
        <section class="game-panel">
          <p class="hint">貢献の多い順。同点は階級値。所在・兵・役職で状況を把握できる。</p>
          <label class="field ranking-filter">
            <span class="field-label">家で絞り込み</span>
            <select class="field-input" data-ranking-filter>
              <option value="">すべて</option>
              <option value="__ronin__">浪人</option>
              {houses.map((name) => (
                <option value={name}>{name}</option>
              ))}
            </select>
          </label>
          <div class="ranking-table-wrap">
            <table class="ranking-table" data-ranking-table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>名前</th>
                  <th>家</th>
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
                    <td colSpan={12} class="hint">
                      まだ武将がいない
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr data-house={row.houseName ?? '__ronin__'}>
                      <td>{i + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.houseName ?? '浪人'}</td>
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
        </section>
      </GameSubpageShell>
    </SiteShell>
  )
}
