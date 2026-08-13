type StatGaugeProps = {
  label: string
  value: number
  max: number
  /** 補助表示（EX など） */
  sub?: string
  tone?: 'buyu' | 'chiryaku' | 'toso' | 'tokubo' | 'agri' | 'commerce' | 'loyalty' | 'money' | 'rice'
  icon?: unknown
}

export function StatGauge({ label, value, max, sub, tone = 'buyu', icon }: StatGaugeProps) {
  const safeMax = Math.max(max, 1)
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100))

  return (
    <div class={`stat-gauge tone-${tone}`}>
      <div class="stat-gauge-meta">
        <span class="stat-gauge-label">
          {icon}
          {label}
        </span>
        <span class="stat-gauge-value">
          {value}
          <span class="stat-gauge-max">/{max}</span>
        </span>
      </div>
      <div class="stat-gauge-track" aria-hidden="true">
        <div class="stat-gauge-fill" style={{ width: `${pct}%` }} />
      </div>
      {sub ? <p class="stat-gauge-sub">{sub}</p> : null}
    </div>
  )
}
