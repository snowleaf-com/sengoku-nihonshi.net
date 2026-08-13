import { STAT_EX_PER_LEVEL } from '../config/commands'

type ExGaugeProps = {
  value: number
  tone?: 'buyu' | 'chiryaku' | 'toso' | 'tokubo'
}

/** 次の能力+1までの EX ゲージ（上限 STAT_EX_PER_LEVEL） */
export function ExGauge({ value, tone = 'buyu' }: ExGaugeProps) {
  const capped = Math.max(0, Math.min(STAT_EX_PER_LEVEL, value))
  const pct = (capped / STAT_EX_PER_LEVEL) * 100

  return (
    <div class={`ex-gauge tone-${tone}`}>
      <div class="ex-gauge-meta">
        <span>EX</span>
        <span>
          {capped}
          <span class="ex-gauge-max">/{STAT_EX_PER_LEVEL}</span>
        </span>
      </div>
      <div class="ex-gauge-track" aria-hidden="true">
        <div class="ex-gauge-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
