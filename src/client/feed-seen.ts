/** 知らせ・結果のセッション未読ハイライト */
const STORAGE_KEY = 'sengoku-feed-seen-v1'

type SeenStore = Record<string, number>

function readStore(): SeenStore {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as SeenStore
  } catch {
    return {}
  }
}

function writeStore(store: SeenStore) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* private mode など */
  }
}

function markSeen(id: string, latest: number) {
  const store = readStore()
  const prev = Number(store[id] ?? 0)
  if (latest > prev) {
    store[id] = latest
    writeStore(store)
  }
}

function applyBadge(link: HTMLElement) {
  const id = link.dataset.feedBadge
  if (!id) return
  const latest = Number(link.dataset.feedLatest ?? 0)
  if (!Number.isFinite(latest) || latest <= 0) {
    link.classList.remove('has-unseen')
    link.querySelector('.feed-new-chip')?.remove()
    return
  }

  const seen = Number(readStore()[id] ?? 0)
  const unseen = latest > seen
  link.classList.toggle('has-unseen', unseen)

  let chip = link.querySelector<HTMLElement>('.feed-new-chip')
  if (unseen) {
    if (!chip) {
      chip = document.createElement('span')
      chip.className = 'feed-new-chip'
      chip.textContent = '新'
      link.appendChild(chip)
    }
  } else {
    chip?.remove()
  }
}

function bootFeedSeen() {
  const links = Array.from(
    document.querySelectorAll('[data-feed-badge]'),
  ) as HTMLElement[]
  if (links.length === 0) return

  for (const link of links) {
    applyBadge(link)
    link.addEventListener('click', () => {
      const id = link.dataset.feedBadge
      const latest = Number(link.dataset.feedLatest ?? 0)
      if (!id || !Number.isFinite(latest)) return
      markSeen(id, latest)
      applyBadge(link)
    })
  }

  for (const link of links) {
    const id = link.dataset.feedBadge
    const href = link.getAttribute('href')
    if (!id || !href || !href.startsWith('#')) continue
    const el = document.getElementById(href.slice(1))
    if (!el) continue
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const latest = Number(link.dataset.feedLatest ?? 0)
          if (Number.isFinite(latest) && latest > 0) {
            markSeen(id, latest)
            applyBadge(link)
          }
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootFeedSeen)
} else {
  bootFeedSeen()
}
