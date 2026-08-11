/**
 * 武将作成: 能力3値の合計が予算内か表示する。
 * 立ち回り差し替え後の HTMX 断片でも動くよう、document 委譲で扱う。
 */

function readInt(input: HTMLInputElement): number {
  const n = Number(input.value)
  return Number.isFinite(n) ? n : 0
}

function syncStatPool(root: HTMLElement) {
  const total = Number(root.dataset.statTotal ?? '150')
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('.stat-input'))
  let used = 0
  for (const input of inputs) {
    used += readInt(input)
  }
  const remaining = total - used
  const remainingEl = root.querySelector<HTMLElement>('[data-stat-remaining]')
  const pool = root.querySelector<HTMLElement>('[data-stat-pool]')
  if (remainingEl) remainingEl.textContent = String(remaining)
  if (pool) {
    pool.classList.toggle('is-ok', remaining === 0)
    pool.classList.toggle('is-bad', remaining !== 0)
  }
}

function init() {
  document.addEventListener('input', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    if (!target.classList.contains('stat-input')) return
    const root = target.closest<HTMLElement>('[data-stat-adjust]')
    if (!root) return
    syncStatPool(root)
  })

  document.body.addEventListener('htmx:afterSwap', ((event: CustomEvent) => {
    const target = event.detail?.target
    if (!(target instanceof HTMLElement)) return
    const root = target.matches('[data-stat-adjust]')
      ? target
      : target.querySelector<HTMLElement>('[data-stat-adjust]')
    if (root) syncStatPool(root)
  }) as EventListener)

  for (const root of Array.from(document.querySelectorAll<HTMLElement>('[data-stat-adjust]'))) {
    syncStatPool(root)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
