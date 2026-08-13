import {
  COMMAND_QUEUE_MAX,
  COMMANDS,
  buildCommandSlots,
  getCommand,
  formatEffectAmount,
  effectLabel,
  isCostEffect,
  visibleEffects,
  type CommandEffect,
  type GameCommand,
} from '../config/commands'
import { formatGameDate, dateAtQueueOffset } from '../config/calendar'
import type { CharacterCommand, WorldEvent } from '../types'
import { IconTrendingDown, IconTrendingUp } from './icons'
import { EventFeed } from './EventFeed'
import { StatIcon } from './StatIcon'

type CommandPanelProps = {
  queue: CharacterCommand[]
  currentYear: number
  currentMonth: number
  results?: WorldEvent[]
  error?: string | null
}

function EffectChips({ command }: { command: GameCommand }) {
  return (
    <ul class="effect-chips">
      {visibleEffects(command).map((effect) => (
        <EffectChip effect={effect} key={`${effect.target}-${effect.magnitude}`} />
      ))}
    </ul>
  )
}

function EffectChip({ effect }: { effect: CommandEffect }) {
  const cost = isCostEffect(effect.magnitude)
  return (
    <li class={`effect-chip ${cost ? 'effect-cost' : 'effect-gain'} effect-${effect.magnitude}`}>
      <StatIcon target={effect.target} class="effect-icon" size={14} />
      <span class="effect-name">{effectLabel(effect.target)}</span>
      <span class="effect-delta">{formatEffectAmount(effect)}</span>
      {cost ? (
        <IconTrendingDown class="effect-trend" />
      ) : (
        <IconTrendingUp class="effect-trend" />
      )}
    </li>
  )
}

export function CommandPanel({
  queue,
  currentYear,
  currentMonth,
  results = [],
  error = null,
}: CommandPanelProps) {
  const slots = buildCommandSlots(queue)
  const filled = slots.filter(Boolean).length
  const currentDate = { year: currentYear, month: currentMonth }

  return (
    <section
      class={`command-panel${error ? ' has-error' : ''}`}
      data-command-queue
      data-current-month={String(currentMonth)}
      data-selected-count="0"
    >
      <form class="command-board" method="post" data-command-form>
        <div class="command-panel-top">
          <div class="command-panel-bar">
            <h2>コマンド</h2>
            <span class="queue-capacity">
              {filled}/{COMMAND_QUEUE_MAX}
            </span>
            <span class="queue-selected">
              選択 <span data-queue-selected-count>0</span>
            </span>
          </div>

          <div class="queue-toolbar" role="toolbar" aria-label="予約枠の選択">
            <button
              type="button"
              class="btn btn-ghost btn-small"
              data-queue-select="all"
              title="すべての枠を選択"
            >
              全選択
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-small"
              data-queue-select="odd"
              title="奇数番号の枠を選択"
            >
              奇数
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-small"
              data-queue-select="even"
              title="偶数番号の枠を選択"
            >
              偶数
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-small"
              data-queue-select="none"
              title="枠の選択だけ外す"
            >
              選択解除
            </button>
          </div>

          <div class="queue-select-tools">
            <div class="queue-select-row" title="枠0＝現在月として、同じ月の枠を選ぶ">
              <span class="queue-select-label">月</span>
              <div class="queue-month-grid" role="group" aria-label="月で選択">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <button
                    type="button"
                    class="btn btn-ghost btn-small queue-month-btn"
                    data-queue-select-month={String(month)}
                    key={`month-${month}`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>

            <div class="queue-select-row">
              <span class="queue-select-label">検索</span>
              <input
                type="search"
                class="queue-tool-input queue-tool-search"
                data-queue-search
                placeholder="開墾 など"
                autocomplete="off"
                enterkeyhint="search"
              />
              <button type="button" class="btn btn-ghost btn-small" data-queue-select-search>
                選択
              </button>
            </div>

            <div class="queue-select-row" title="例: 1番から2ごと20まで → 1,3,5…19">
              <span class="queue-select-label">範囲</span>
              <input
                type="number"
                class="queue-tool-input queue-tool-num"
                data-queue-from
                min={1}
                max={COMMAND_QUEUE_MAX}
                placeholder="1"
                inputmode="numeric"
              />
              <span class="queue-select-unit">番から</span>
              <input
                type="number"
                class="queue-tool-input queue-tool-num"
                data-queue-step
                min={1}
                max={COMMAND_QUEUE_MAX}
                placeholder="1"
                inputmode="numeric"
              />
              <span class="queue-select-unit">ごと</span>
              <input
                type="number"
                class="queue-tool-input queue-tool-num"
                data-queue-to
                min={1}
                max={COMMAND_QUEUE_MAX}
                placeholder={String(COMMAND_QUEUE_MAX)}
                inputmode="numeric"
              />
              <span class="queue-select-unit">まで</span>
              <button type="button" class="btn btn-ghost btn-small" data-queue-select-range>
                選択
              </button>
            </div>
          </div>

          <div
            class={`command-panel-status${error ? ' is-visible' : ''}`}
            data-command-status
            role="status"
            aria-live="polite"
          >
            {error ?? ''}
          </div>
        </div>

        <div class="command-board-scroll">
          <div class="command-board-main">
            <ol class="command-queue-list" data-queue-list>
              {slots.map((item, index) => {
                const displayIndex = index + 1
                const def = item ? getCommand(item.commandId) : null
                const empty = !item
                const label = empty ? '—' : (def?.label ?? item.commandId)
                const slotDate = dateAtQueueOffset(currentDate, index)
                const slotMonth = slotDate.month
                const dateLabel = formatGameDate(slotDate)
                return (
                  <li
                    class={`command-queue-item${empty ? ' is-empty' : ''}`}
                    key={`slot-${index}`}
                  >
                    <label class="queue-select">
                      <input
                        type="checkbox"
                        name="positions"
                        value={String(index)}
                        data-queue-index={displayIndex}
                        data-queue-month={String(slotMonth)}
                        data-queue-label={label}
                      />
                      <span class="queue-index">{displayIndex}</span>
                      <span class="queue-date">{dateLabel}</span>
                      <span class={`queue-label${empty ? ' is-empty' : ''}`}>{label}</span>
                    </label>
                  </li>
                )
              })}
            </ol>

            <div class="command-picker-list">
              <button
                type="submit"
                class="command-card command-card-action"
                formaction="/actions/clear-commands"
                data-needs-selection
                title="選んだ枠のコマンドを空にする"
              >
                <strong class="command-card-label">削除</strong>
                <span class="command-card-hint">選んだ枠を空にする</span>
              </button>
              <button
                type="submit"
                class="command-card command-card-action"
                formaction="/actions/repeat-commands"
                data-needs-selection
                title="選んだ並びを後ろの枠へ繰り返す"
              >
                <strong class="command-card-label">繰返</strong>
                <span class="command-card-hint">選んだ並びを後ろへ繰り返す</span>
              </button>
              {COMMANDS.map((command) => (
                <button
                  type="submit"
                  class="command-card"
                  formaction="/actions/apply-commands"
                  name="commandId"
                  value={command.id}
                  key={command.id}
                  data-needs-selection
                >
                  <strong class="command-card-label">{command.label}</strong>
                  <EffectChips command={command} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <EventFeed title="実行結果" events={results} empty="まだ実行結果はない" />
      </form>
    </section>
  )
}
