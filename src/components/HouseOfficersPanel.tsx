import { formatGameDate, dateAtQueueOffset, formatRealtime, realtimeAtQueueOffset } from '../config/calendar'
import { formatQueueLabel } from '../config/command-payload'
import { getCommand } from '../config/commands'
import { iconPublicPath } from '../config/icons'
import type { CharacterCommand } from '../types'

export type HouseOfficerRow = {
  characterId: string
  name: string
  iconId: string
  roleLabel: string
  provinceName: string
  buyu: number
  chiryaku: number
  toso: number
  tokubo: number
  queue: CharacterCommand[]
  /** 次コマンドまでの秒（空キューは大きい値で末尾） */
  nextDueIn: number
}

type HouseOfficersPanelProps = {
  officers: HouseOfficerRow[]
  currentYear: number
  currentMonth: number
  nextTurnAt: number
  turnIntervalSeconds: number
  provinceNameById: Record<string, string>
  characterNameById: Record<string, string>
}

export function HouseOfficersPanel({
  officers,
  currentYear,
  currentMonth,
  nextTurnAt,
  turnIntervalSeconds,
  provinceNameById,
  characterNameById,
}: HouseOfficersPanelProps) {
  const currentDate = { year: currentYear, month: currentMonth }
  const sorted = [...officers].sort((a, b) => {
    if (a.nextDueIn !== b.nextDueIn) return a.nextDueIn - b.nextDueIn
    return a.name.localeCompare(b.name, 'ja')
  })

  return (
    <section class="house-officers" aria-label="我が国の将">
      <h3 class="house-officers-title">我が国の将</h3>
      <p class="hint">次のコマンド実行が近い順。予定は最大4件。</p>
      {sorted.length === 0 ? (
        <p class="hint">家臣はいない</p>
      ) : (
        <ul class="house-officers-list">
          {sorted.map((row) => {
            const upcoming = row.queue.slice(0, 4).map((cmd, i) => {
              const def = getCommand(cmd.commandId)
              const label = formatQueueLabel(
                cmd.commandId,
                cmd.payload,
                def?.label ?? cmd.commandId,
                (id) => provinceNameById[id] ?? null,
                (id) => characterNameById[id] ?? null,
              )
              const gameWhen = formatGameDate(dateAtQueueOffset(currentDate, cmd.position))
              const realWhen = formatRealtime(
                realtimeAtQueueOffset(nextTurnAt, cmd.position, turnIntervalSeconds),
              )
              return { key: `${cmd.id}-${i}`, label, gameWhen, realWhen }
            })
            return (
              <li class="house-officer" key={row.characterId}>
                <div class="house-officer-head">
                  <img
                    class="house-officer-icon"
                    src={iconPublicPath(row.iconId)}
                    alt=""
                    width="36"
                    height="36"
                  />
                  <div class="house-officer-who">
                    <strong class="house-officer-name">{row.name}</strong>
                    <span class="house-officer-meta">
                      {row.roleLabel} · {row.provinceName}
                    </span>
                    <span class="house-officer-stats">
                      武{row.buyu} 知{row.chiryaku} 統{row.toso} 徳{row.tokubo}
                    </span>
                  </div>
                </div>
                {upcoming.length === 0 ? (
                  <p class="hint house-officer-empty">予約なし</p>
                ) : (
                  <ol class="house-officer-queue">
                    {upcoming.map((q) => (
                      <li key={q.key}>
                        <time class="house-officer-when">
                          {q.gameWhen}
                          <span class="house-officer-realtime">{q.realWhen}</span>
                        </time>
                        <span>{q.label}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
