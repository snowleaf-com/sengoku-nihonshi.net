import {
  COMMAND_QUEUE_MAX,
  COMMANDS,
  buildCommandSlots,
  commandPickerRank,
  getCommand,
  formatEffectAmount,
  effectLabel,
  isCostEffect,
  visibleEffects,
  type CommandEffect,
  type GameCommand,
} from '../config/commands'
import { formatQueueLabel } from '../config/command-payload'
import { formatGameDate, dateAtQueueOffset, formatRealtime, realtimeAtQueueOffset } from '../config/calendar'
import { TRADE_MAX } from '../config/net'
import type { CharacterCommand } from '../types'
import type { CommandPresetView } from '../services/command-presets'
import { IconTrendingDown, IconTrendingUp } from './icons'
import { StatIcon } from './StatIcon'

type AdjacentOption = { id: string; name: string }

type WarTargetOption = { id: string; name: string; ownerLabel: string }

type RecruitTargetOption = { id: string; name: string; houseLabel: string }

type CommandPanelProps = {
  queue: CharacterCommand[]
  currentYear: number
  currentMonth: number
  nextTurnAt: number
  turnIntervalSeconds: number
  error?: string | null
  inHomeLand: boolean
  canShikan: boolean
  adjacentProvinces: AdjacentOption[]
  warTargets: WarTargetOption[]
  recruitTargets: RecruitTargetOption[]
  marketRate: number
  provinceNameById: Record<string, string>
  characterNameById: Record<string, string>
  troopCap: number
  presets?: CommandPresetView[]
  maintenance?: boolean
  notice?: string | null
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
  nextTurnAt,
  turnIntervalSeconds,
  error = null,
  inHomeLand,
  canShikan,
  adjacentProvinces,
  warTargets,
  recruitTargets,
  marketRate,
  provinceNameById,
  characterNameById,
  troopCap,
  presets = [],
  maintenance = false,
  notice = null,
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
            <span class="queue-capacity">
              {filled}/{COMMAND_QUEUE_MAX}
            </span>
            <span class="queue-selected">
              選択 <span data-queue-selected-count>0</span>
            </span>
          </div>
          <div class="command-pane-switch" role="tablist" aria-label="コマンド画面">
            <button
              type="button"
              class="btn btn-ghost btn-small is-active"
              data-command-pane-tab="queue"
              role="tab"
              aria-selected="true"
            >
              一覧
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-small"
              data-command-pane-tab="select"
              role="tab"
            >
              選択
            </button>
            <button type="button" class="btn btn-ghost btn-small" data-command-pane-tab="pick" role="tab">
              コマンド
            </button>
          </div>

          {maintenance ? (
            <p class="hint command-foreign-hint">メンテナンス中のためコマンドを入力できません。</p>
          ) : null}

          {!inHomeLand && !maintenance ? (
            <p class="hint command-foreign-hint">
              ここは自国ではありません。移動・仕官・集合・何もしないのみできます。
            </p>
          ) : null}

          <div
            class={`command-panel-status${error ? ' is-visible' : notice ? ' is-visible is-notice' : ''}`}
            data-command-status
            role="status"
            aria-live="polite"
          >
            {error || notice || ''}
          </div>
        </div>

        <div class="command-board-body">
          <div class="command-side">
          <div class="command-select-pane">
            <h3 class="command-pane-title">選択</h3>

            <section class="select-group">
              <h4>枠</h4>
              <div class="select-actions" role="toolbar" aria-label="予約枠の選択">
                <button type="button" class="btn btn-ghost btn-small" data-queue-select="all">
                  すべて
                </button>
                <button type="button" class="btn btn-ghost btn-small" data-queue-select="odd">
                  奇数
                </button>
                <button type="button" class="btn btn-ghost btn-small" data-queue-select="even">
                  偶数
                </button>
                <button type="button" class="btn btn-ghost btn-small" data-queue-select="none">
                  解除
                </button>
              </div>
            </section>

            <section class="select-group">
              <h4>月</h4>
              <p class="select-note">同じ月の枠を選ぶ。複数の月を押せる</p>
              <div class="queue-month-grid" role="group" aria-label="月で選択">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <button
                    type="button"
                    class={`btn btn-ghost btn-small queue-month-btn${month === currentMonth ? ' is-now' : ''}`}
                    data-queue-select-month={String(month)}
                    aria-pressed="false"
                    key={`month-${month}`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </section>

            <section class="select-group">
              <h4>名前</h4>
              <div class="select-search">
                <input
                  type="search"
                  class="queue-tool-input queue-tool-search"
                  data-queue-search
                  placeholder="農業 など"
                  autocomplete="off"
                  enterkeyhint="search"
                  aria-label="コマンド名で選択"
                />
                <button type="button" class="btn btn-ghost btn-small" data-queue-select-search>
                  選ぶ
                </button>
              </div>
            </section>

            <section class="select-group">
              <h4>定型</h4>
              <p class="select-note">選んだ並びを保存し、先頭の枠から繰り返す</p>
              {Array.from({ length: 3 }, (_, index) => {
                const slot = index + 1
                const preset = presets.find((row) => row.slot === slot)
                const saved = (preset?.steps.length ?? 0) > 0
                return (
                  <div class="command-preset-row" key={`preset-${slot}`}>
                    <input
                      class="field-input command-preset-name"
                      type="text"
                      name={`presetName${slot}`}
                      maxlength={8}
                      value={preset?.name ?? ''}
                      placeholder={`定型${slot}`}
                      autocomplete="off"
                      aria-label={`定型${slot}の名前`}
                    />
                    <button
                      type="submit"
                      class="btn btn-ghost btn-small"
                      formaction="/actions/save-preset"
                      formnovalidate
                      name="presetSlot"
                      value={String(slot)}
                      disabled={maintenance}
                    >
                      保存
                    </button>
                    <button
                      type="submit"
                      class="btn btn-ghost btn-small"
                      formaction="/actions/apply-preset"
                      formnovalidate
                      name="presetSlot"
                      value={String(slot)}
                      disabled={maintenance || !saved}
                    >
                      入れる
                    </button>
                  </div>
                )
              })}
            </section>
          </div>

          <div class="command-queue-pane">
            <h3 class="command-pane-title">一覧</h3>
          <div class="command-queue-scroll">
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
                      (id) => characterNameById[id] ?? null,
                    )
                const slotDate = dateAtQueueOffset(currentDate, index)
                const slotMonth = slotDate.month
                const dateLabel = formatGameDate(slotDate)
                const realtimeLabel = formatRealtime(
                  realtimeAtQueueOffset(nextTurnAt, index, turnIntervalSeconds),
                )
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
                      <span class="queue-date">
                        <span>{dateLabel}</span>
                        <span class="queue-realtime">{realtimeLabel}</span>
                      </span>
                      <span class={`queue-label${empty ? ' is-empty' : ''}`}>{label}</span>
                    </label>
                  </li>
                )
              })}
            </ol>
          </div>
          </div>
          </div>

          <div class="command-picker-list">
            <h3 class="command-pane-title">コマンド</h3>
              <button
                type="submit"
                class="command-card command-card-action"
                formaction="/actions/clear-commands"
                data-needs-selection
              >
                <span class="command-card-head">
                  <strong class="command-card-label">削除</strong>
                </span>
                <span class="command-card-hint">選んだ枠を空にする</span>
              </button>
              <button
                type="submit"
                class="command-card command-card-action"
                formaction="/actions/repeat-commands"
                data-needs-selection
              >
                <span class="command-card-head">
                  <strong class="command-card-label">繰返</strong>
                </span>
                <span class="command-card-hint">選んだ並びを後ろへ繰り返す</span>
              </button>

              <div class="command-param-block" style={{ order: commandPickerRank('idou') }}>
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
                  disabled={maintenance || adjacentProvinces.length === 0}
                >
                  移動を入力
                </button>
              </div>

              {inHomeLand && !maintenance ? (
                <div class="command-param-block" style={{ order: commandPickerRank('beibai') }}>
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

              {inHomeLand && !maintenance ? (
                <div class="command-param-block" style={{ order: commandPickerRank('chouhei') }}>
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

              {inHomeLand && !maintenance ? (
                <div class="command-param-block" style={{ order: commandPickerRank('sensou') }}>
                  <strong class="command-card-label">戦争</strong>
                  <p class="hint">隣接する敵国・中立国のみ。建国後36ヶ月で解禁</p>
                  <label class="field field-inline">
                    <span class="field-label">攻撃先</span>
                    <select class="field-input" name="warProvinceId" required={false}>
                      <option value="">隣接の敵・中立を選ぶ</option>
                      {warTargets.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}（{p.ownerLabel}）
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    class="btn btn-primary btn-small"
                    formaction="/actions/apply-commands"
                    name="commandId"
                    value="sensou"
                    data-needs-selection
                    disabled={warTargets.length === 0}
                  >
                    戦争を入力
                  </button>
                </div>
              ) : null}

              {inHomeLand && !maintenance ? (
                <div class="command-param-block" style={{ order: commandPickerRank('tanren') }}>
                  <strong class="command-card-label">鍛錬</strong>
                  <p class="hint">金50・選んだ能力のEX+2・貢献+10</p>
                  <label class="field field-inline">
                    <span class="field-label">能力</span>
                    <select class="field-input" name="trainStat">
                      <option value="buyu">武勇</option>
                      <option value="chiryaku">知略</option>
                      <option value="toso">統率</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    class="btn btn-primary btn-small"
                    formaction="/actions/apply-commands"
                    name="commandId"
                    value="tanren"
                    data-needs-selection
                  >
                    鍛錬を入力
                  </button>
                </div>
              ) : null}

              {inHomeLand && !maintenance ? (
                <div class="command-param-block" style={{ order: commandPickerRank('touyou') }}>
                  <strong class="command-card-label">登用</strong>
                  <p class="hint">金100・同国の他家／浪人。成功率は乱数・貢献・忠誠</p>
                  <label class="field field-inline">
                    <span class="field-label">対象</span>
                    <select class="field-input" name="recruitOfficerId" required={false}>
                      <option value="">武将を選ぶ</option>
                      {recruitTargets.map((t) => (
                        <option value={t.id} key={t.id}>
                          {t.name}（{t.houseLabel}）
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    class="btn btn-primary btn-small"
                    formaction="/actions/apply-commands"
                    name="commandId"
                    value="touyou"
                    data-needs-selection
                    disabled={recruitTargets.length === 0}
                  >
                    登用を入力
                  </button>
                </div>
              ) : null}

              {!maintenance
                ? COMMANDS.filter(
                    (command) =>
                      !command.needsPayload && commandAvailable(command, inHomeLand, canShikan),
                  )
                    .slice()
                    .sort((a, b) => commandPickerRank(a.id) - commandPickerRank(b.id))
                    .map((command) => (
                    <button
                      type="submit"
                      class="command-card"
                      style={{ order: commandPickerRank(command.id) }}
                      formaction="/actions/apply-commands"
                      name="commandId"
                      value={command.id}
                      key={command.id}
                      data-needs-selection
                    >
                      <span class="command-card-head">
                        <strong class="command-card-label">{command.label}</strong>
                      </span>
                      <span class="command-card-hint">{command.blurb}</span>
                      <EffectChips command={command} />
                    </button>
                  ))
                : null}
          </div>
        </div>
      </form>
    </section>
  )
}
