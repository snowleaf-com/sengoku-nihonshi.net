type HubTab = 'map' | 'self' | 'results' | 'news'

const HUB_HOME_STORAGE_KEY = 'hub-home-tab'

function isHubTab(value: string | null | undefined): value is HubTab {
  return value === 'map' || value === 'self' || value === 'results' || value === 'news'
}

function readHomeTab(): HubTab {
  const home = localStorage.getItem(HUB_HOME_STORAGE_KEY)
  return isHubTab(home) ? home : 'map'
}

function bootHubTabs() {
  const layout = document.querySelector<HTMLElement>('.game-layout[data-hub-tab]')
  if (!layout) return

  const root = layout.closest<HTMLElement>('.game-app') ?? layout

  const syncHomeMarks = (home: HubTab) => {
    root.querySelectorAll<HTMLElement>('[data-hub-home-set]').forEach((btn) => {
      const active = btn.dataset.hubHomeSet === home
      btn.classList.toggle('is-home', active)
      btn.setAttribute('aria-pressed', active ? 'true' : 'false')
    })
    layout.querySelectorAll<HTMLElement>('[data-hub-tab-btn]').forEach((btn) => {
      btn.classList.toggle('is-home-tab', btn.dataset.hubTabBtn === home)
    })
  }

  const setTab = (tab: HubTab) => {
    layout.dataset.hubTab = tab
    layout.querySelectorAll<HTMLElement>('[data-hub-tab-btn]').forEach((btn) => {
      const active = btn.dataset.hubTabBtn === tab
      btn.classList.toggle('is-active', active)
      btn.setAttribute('aria-selected', active ? 'true' : 'false')
    })
  }

  const home = readHomeTab()
  setTab(home)
  syncHomeMarks(home)

  root.querySelectorAll<HTMLElement>('[data-hub-tab-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.hubTabBtn
      if (!isHubTab(raw)) return
      setTab(raw)
    })
  })

  root.querySelectorAll<HTMLElement>('[data-hub-home-set]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.hubHomeSet
      if (!isHubTab(raw)) return
      localStorage.setItem(HUB_HOME_STORAGE_KEY, raw)
      syncHomeMarks(raw)
      setTab(raw)
    })
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHubTabs)
} else {
  bootHubTabs()
}
