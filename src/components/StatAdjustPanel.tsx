import {
  ADJUSTABLE_STAT_TOTAL,
  STAT_MAX,
  STAT_MIN,
  type CharacterStats,
} from '../config/archetypes'

type StatAdjustPanelProps = {
  stats: CharacterStats
}

export function StatAdjustPanel({ stats }: StatAdjustPanelProps) {
  const used = stats.buyu + stats.chiryaku + stats.toso
  const remaining = ADJUSTABLE_STAT_TOTAL - used

  return (
    <div class="stat-adjust" data-stat-adjust data-stat-total={ADJUSTABLE_STAT_TOTAL}>
      <p class="hint">
        武勇・知略・統率を各 {STAT_MIN}〜{STAT_MAX}、合計 {ADJUSTABLE_STAT_TOTAL}{' '}
        で振り分ける。徳望は立ち回りで決まる。
      </p>
      <div class="stat-adjust-grid">
        <label class="stat-field">
          <span class="field-label">武勇</span>
          <input
            class="field-input stat-input"
            type="number"
            name="buyu"
            min={STAT_MIN}
            max={STAT_MAX}
            step={1}
            required
            value={String(stats.buyu)}
            data-stat-key="buyu"
          />
        </label>
        <label class="stat-field">
          <span class="field-label">知略</span>
          <input
            class="field-input stat-input"
            type="number"
            name="chiryaku"
            min={STAT_MIN}
            max={STAT_MAX}
            step={1}
            required
            value={String(stats.chiryaku)}
            data-stat-key="chiryaku"
          />
        </label>
        <label class="stat-field">
          <span class="field-label">統率</span>
          <input
            class="field-input stat-input"
            type="number"
            name="toso"
            min={STAT_MIN}
            max={STAT_MAX}
            step={1}
            required
            value={String(stats.toso)}
            data-stat-key="toso"
          />
        </label>
        <div class="stat-field is-locked">
          <span class="field-label">徳望</span>
          <p class="stat-locked-value">{stats.tokubo}</p>
          <input type="hidden" name="tokubo" value={String(stats.tokubo)} />
        </div>
      </div>
      <p
        class={`stat-pool${remaining === 0 ? ' is-ok' : ' is-bad'}`}
        data-stat-pool
      >
        残りポイント: <strong data-stat-remaining>{remaining}</strong>
      </p>
    </div>
  )
}
