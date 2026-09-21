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
import { formatQueueLabel } from '../config/command-payload'
import { formatGameDate, dateAtQueueOffset } from '../config/calendar'
import { TRADE_MAX } from '../config/net'
import type { CharacterCommand, WorldEvent } from '../types'
import { IconTrendingDown, IconTrendingUp } from './icons'
import { EventFeed } from './EventFeed'
import { StatIcon } from './StatIcon'

type AdjacentOption = { id: string; name: string }

type CommandPanelProps = {
  queue: CharacterCommand[]
  currentYear: number
  currentMonth: number
  results?: WorldEvent[]
  error?: string | null
  inHomeLand: boolean
  canShikan: boolean
  adjacentProvinces: AdjacentOption[]
  marketRate: number
  provinceNameById: Record<string, string>
  troopCap: number
}

function EffectChips({ command }: { command: GameCommand }) {
  const effects = visibleEffects(command)
  if (effects.length === 0) return null
  return (
    <ul class="effect-chips">
      {effects.map((effect) => (
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

function commandAvailable(command: GameCommand, inHomeLand: boolean, canShikan: boolean): boolean {
  if (command.id === 'shikan') return canShikan
  if (command.foreignOk) return true
  return inHomeLand
}

export function CommandPanel({
  queue,
  currentYear,
  currentMonth,
  results = [],
  error = null,
  inHomeLand,
  canShikan,
  adjacentProvinces,
  marketRate,
  provinceNameById,
  troopCap,
}: CommandPanelProps) {
  const slots = buildCommandSlots(queue)
  const filled = slots.filter(Boolean).length
  const currentDate = { year: currentYear, month: currentMonth }
  const ricePer100 = Math.floor(marketRate * 100)
  const goldPer100 = Math.floor((2 - marketRate) * 100)

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

          {!inHomeLand ? (
            <p class="hint command-foreign-hint">
              ここは自国ではありません。移動と仕官のみできます。
            </p>
          ) : null}

          <div class="queue-toolbar" role="toolbar" aria-label="予約枠の選択">
            <button type="button" class="btn btn-ghost btn-small" data-queue-select="all">
              全選択
            </button>
            <button type="button" class="btn btn-ghost btn-small" data-queue-select="odd">
              奇数
            </button>
            <button type="button" class="btn btn-ghost btn-small" data-queue-select="even">
              偶数
            </button>
            <button type="button" class="btn btn-ghost btn-small" data-queue-select="none">
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
                placeholder="農業 など"
                autocomplete="off"
                enterkeyhint="search"
              />
              <button type="button" class="btn btn-ghost btn-small" data-queue-select-search>
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
                const empty = !item
                const label = empty
                  ? '—'
                  : formatQueueLabel(
                      item.commandId,
                      item.payload,
                      getCommand(item.commandId)?.label ?? item.commandId,
                      (id) => provinceNameById[id] ?? null,
                    )
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
              >
                <strong class="command-card-label">削除</strong>
                <span class="command-card-hint">選んだ枠を空にする</span>
              </button>
              <button
                type="submit"
                class="command-card command-card-action"
                formaction="/actions/repeat-commands"
                data-needs-selection
              >
                <strong class="command-card-label">繰返</strong>
                <span class="command-card-hint">選んだ並びを後ろへ繰り返す</span>
              </button>

              <div class="command-param-block">
                <strong class="command-card-label">移動</strong>
                <label class="field field-inline">
                  <span class="field-label">行き先</span>
                  <select class="field-input" name="moveProvinceId" required={false}>
                    <option value="">隣接国を選ぶ</option>
                    {adjacentProvinces.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  class="btn btn-primary btn-small"
                  formaction="/actions/apply-commands"
                  name="commandId"
                  value="idou"
                  data-needs-selection
                  disabled={adjacentProvinces.length === 0}
                >
                  移動を入力
                </button>
              </div>

              {inHomeLand ? (
                <div class="command-param-block">
                  <strong class="command-card-label">米売買</strong>
                  <p class="hint">
                    相場 米100→金{ricePer100} / 金100→米{goldPer100}（最大{TRADE_MAX}）
                  </p>
                  <label class="field field-inline">
                    <span class="field-label">取引</span>
                    <select class="field-input" name="tradeSide">
                      <option value="sell_rice">米を売る</option>
                      <option value="sell_gold">金を売る</option>
                    </select>
                  </label>
                  <label class="field field-inline">
                    <span class="field-label">数量</span>
                    <input
                      class="field-input"
                      type="number"
                      name="tradeAmount"
                      min={1}
                      max={TRADE_MAX}
                      value={100}
                    />
                  </label>
                  <button
                    type="submit"
                    class="btn btn-primary btn-small"
                    formaction="/actions/apply-commands"
                    name="commandId"
                    value="beibai"
                    data-needs-selection
                  >
                    売買を入力
                  </button>
                </div>
              ) : null}

              {inHomeLand ? (
                <div class="command-param-block">
                  <strong class="command-card-label">徴兵</strong>
                  <p class="hint">雑兵・金10/人・農民×5・民忠（人数/10）。上限は統率{troopCap}</p>
                  <label class="field field-inline">
                    <span class="field-label">人数</span>
                    <input
                      class="field-input"
                      type="number"
                      name="recruitAmount"
                      min={1}
                      max={Math.max(1, troopCap)}
                      value={Math.min(10, Math.max(1, troopCap))}
                    />
                  </label>
                  <button
                    type="submit"
                    class="btn btn-primary btn-small"
                    formaction="/actions/apply-commands"
                    name="commandId"
                    value="chouhei"
                    data-needs-selection
                  >
                    徴兵を入力
                  </button>
                </div>
              ) : null}

              {COMMANDS.filter(
                (command) =>
                  !command.needsPayload && commandAvailable(command, inHomeLand, canShikan),
              ).map((command) => (
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
                  <span class="command-card-hint">{command.blurb}</span>
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
