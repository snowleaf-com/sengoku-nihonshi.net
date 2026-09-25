/** Hub の次ターン残り表示 */
function formatRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'まもなく / 更新してください'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `残り ${h}時間${m}分`
  if (m > 0) return `残り ${m}分${s}秒`
  return `残り ${s}秒`
}

function tick(el: HTMLElement) {
  const raw = el.dataset.nextTurnAt
  if (!raw) return
  const nextAt = Number(raw)
  if (!Number.isFinite(nextAt)) return
  const remaining = Math.floor(nextAt - Date.now() / 1000)
  el.textContent = formatRemaining(remaining)
  el.hidden = false
}

function bootTurnCountdown() {
  const nodes = document.querySelectorAll<HTMLElement>('[data-next-turn-at]')
  if (nodes.length === 0) return
  const run = () => nodes.forEach(tick)
  run()
  window.setInterval(run, 1000)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootTurnCountdown)
} else {
  bootTurnCountdown()
}
