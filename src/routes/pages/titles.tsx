import { GameSubpageShell } from '../../components/GameSocialNav'
import { SiteShell } from '../../components/SiteShell'
import type { TitleBoard, TitleEntry } from '../../types'

type TitlesPageProps = {
  highlight: TitleEntry[]
  boards: TitleBoard[]
}

function RankMark({ rank }: { rank: number }) {
  const tone = rank <= 3 ? `is-top-${rank}` : ''
  return <span class={`title-rank ${tone}`}>{rank}</span>
}

export function TitlesPage({ highlight, boards }: TitlesPageProps) {
  return (
    <SiteShell title="名称一覧 — 戦国日本史.net">
      <GameSubpageShell title="名称一覧" active="titles">
        <section class="game-panel titles-panel">
          <p class="hint">各指標の上位10名。原本の名称一覧（ranking2）に相当。</p>

          {highlight.length > 0 ? (
            <ul class="title-highlight" aria-label="各部門1位">
              {highlight.map((row) => (
                <li class="title-highlight-item">
                  <strong class="title-highlight-name">{row.name}</strong>
                  <span class="title-highlight-meta">
                    {row.houseName} · {row.valueLabel}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p class="hint">まだ武将がいない</p>
          )}

          <div class="title-boards">
            {boards.map((board) => (
              <article class="title-board" id={`title-${board.id}`}>
                <header class="title-board-head">
                  <h2 class="title-board-heading">{board.title}</h2>
                  <span class="title-board-cap">Top {board.entries.length || 10}</span>
                </header>
                {board.entries.length === 0 ? (
                  <p class="hint title-board-empty">—</p>
                ) : (
                  <ol class="title-board-list">
                    {board.entries.map((entry) => (
                      <li class={`title-board-row${entry.rank <= 3 ? ' is-podium' : ''}`}>
                        <RankMark rank={entry.rank} />
                        <div class="title-board-who">
                          <span class="title-board-name">{entry.name}</span>
                          <span class="title-board-house">{entry.houseName}</span>
                        </div>
                        <span class="title-board-value">{entry.valueLabel}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>
        </section>
      </GameSubpageShell>
    </SiteShell>
  )
}
