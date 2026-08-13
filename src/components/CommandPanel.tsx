import {
  COMMANDS,
  effectLabel,
  formatEffectAmount,
  getCommand,
  isCostEffect,
  visibleEffects,
  type CommandEffect,
  type GameCommand,
} from '../config/commands'
import type { CharacterCommand } from '../types'
import { IconTrendingDown, IconTrendingUp } from './icons'
import { StatIcon } from './StatIcon'

type CommandPanelProps = {
  queue: CharacterCommand[]
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

export function CommandPanel({ queue }: CommandPanelProps) {
  return (
    <section class="command-panel">
      <h2>コマンド</h2>
      <p class="panel-lead">効果と消費量がそのまま見える。選ぶと予約される。</p>

      <div class="command-picker">
        {COMMANDS.map((command) => (
          <form
            class="command-card"
            method="post"
            action="/actions/enqueue-command"
            key={command.id}
          >
            <input type="hidden" name="commandId" value={command.id} />
            <div class="command-card-head">
              <strong>{command.label}</strong>
              <span class="command-blurb">{command.blurb}</span>
            </div>
            <EffectChips command={command} />
            <button type="submit" class="btn btn-primary btn-small">
              予約
            </button>
          </form>
        ))}
      </div>

      <div class="command-queue">
        <h3>予約（次ターンから消化）</h3>
        {queue.length === 0 ? (
          <p class="hint">まだ予約がない。</p>
        ) : (
          <ol class="command-queue-list">
            {queue.map((item, index) => {
              const def = getCommand(item.commandId)
              return (
                <li class="command-queue-item" key={item.id}>
                  <span class="queue-index">{index + 1}</span>
                  <span class="queue-label">{def?.label ?? item.commandId}</span>
                  {def ? <EffectChips command={def} /> : null}
                  <form method="post" action="/actions/cancel-command">
                    <input type="hidden" name="queueId" value={item.id} />
                    <button type="submit" class="btn btn-ghost btn-small">
                      取消
                    </button>
                  </form>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
