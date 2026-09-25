/** 知らせフィードの種類フィルタ */
function bootEventFeedFilter() {
  const roots = Array.from(
    document.querySelectorAll('[data-event-feed]'),
  ) as HTMLElement[]

  for (const root of roots) {
    const buttons = Array.from(
      root.querySelectorAll('[data-feed-kind]'),
    ) as HTMLButtonElement[]
    const items = Array.from(
      root.querySelectorAll<HTMLElement>('.event-feed-item[data-event-kind]'),
    )
    const emptyFiltered = root.querySelector<HTMLElement>('.event-feed-filtered-empty')
    const emptyDefault = root.querySelector<HTMLElement>('.event-feed-empty:not(.event-feed-filtered-empty)')

    if (buttons.length === 0) continue

    const apply = (kind: string) => {
      let visible = 0
      for (const item of items) {
        const match = kind === '' || item.dataset.eventKind === kind
        item.hidden = !match
        if (match) visible += 1
      }
      for (const btn of buttons) {
        btn.classList.toggle('is-active', (btn.dataset.feedKind ?? '') === kind)
      }
      if (emptyFiltered) {
        emptyFiltered.hidden = items.length === 0 || visible > 0
      }
      if (emptyDefault && items.length > 0) {
        emptyDefault.hidden = true
      }
    }

    for (const btn of buttons) {
      btn.addEventListener('click', () => apply(btn.dataset.feedKind ?? ''))
    }
    apply('')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootEventFeedFilter)
} else {
  bootEventFeedFilter()
}
