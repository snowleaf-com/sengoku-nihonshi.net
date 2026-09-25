/** Hub の現在時刻（秒更新） */
const CLOCK_OPTS: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}

function tickClock(el: HTMLElement) {
  el.textContent = new Date().toLocaleString('ja-JP', CLOCK_OPTS)
}

function bootLiveClock() {
  const nodes = document.querySelectorAll('[data-live-clock]') as NodeListOf<HTMLElement>
  if (nodes.length === 0) return
  const run = () => nodes.forEach(tickClock)
  run()
  window.setInterval(run, 1000)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootLiveClock)
} else {
  bootLiveClock()
}
