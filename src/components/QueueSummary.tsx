import { formatGameDate, dateAtQueueOffset } from '../config/calendar'
import { formatQueueLabel } from '../config/command-payload'
import {
  COMMAND_QUEUE_MAX,
  buildCommandSlots,
  getCommand,
} from '../config/commands'
import type { CharacterCommand } from '../types'

type QueueSummaryProps = {
  queue: CharacterCommand[]
  currentYear: number
  currentMonth: number
  provinceNameById: Record<string, string>
  characterNameById: Record<string, string>
}

/** シートを閉じても見える予約キュー要約（#16 B） */
export function QueueSummary({
  queue,
  currentYear,
  currentMonth,
  provinceNameById,
  characterNameById,
}: QueueSummaryProps) {
  const slots = buildCommandSlots(queue)
  const filled = slots.filter(Boolean).length
  const currentDate = { year: currentYear, month: currentMonth }
  const upcoming = slots
    .map((item, position) => {
      if (!item) return null
      const def = getCommand(item.commandId)
      const label = formatQueueLabel(
        item.commandId,
        item.payload,
        def?.label ?? item.commandId,
        (id) => provinceNameById[id] ?? null,
        (id) => characterNameById[id] ?? null,
      )
      const when = formatGameDate(dateAtQueueOffset(currentDate, position))
      return { position, when, label }
    })
    .filter((row): row is { position: number; when: string; label: string } => row != null)
    .slice(0, 8)

  return (
    <section class="queue-summary" aria-label="コマンド予約">
      <div class="queue-summary-head">
        <h2 class="queue-summary-title">予約</h2>
        <span class="queue-summary-count">
          {filled}/{COMMAND_QUEUE_MAX}
        </span>
        <button type="button" class="btn btn-ghost btn-small btn-touch" data-open-commands>
          編集
        </button>
      </div>
      {upcoming.length === 0 ? (
        <p class="hint queue-summary-empty">まだ予約はない。コマンドを開いて入れる。</p>
      ) : (
        <ol class="queue-summary-list">
          {upcoming.map((row) => (
            <li class="queue-summary-item" key={`q-${row.position}`}>
              <time class="queue-summary-when">{row.when}</time>
              <span class="queue-summary-label">{row.label}</span>
            </li>
          ))}
        </ol>
      )}
      {filled > upcoming.length ? (
        <p class="hint">ほか {filled - upcoming.length} 件はシートで確認</p>
      ) : null}
    </section>
  )
}
