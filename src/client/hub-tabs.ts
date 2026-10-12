type HubTab = 'map' | 'self' | 'news'

const HUB_TAB_STORAGE_KEY = 'hub-tab'

function isHubTab(value: string | null | undefined): value is HubTab {
  return value === 'map' || value === 'self' || value === 'news'
}

function bootHubTabs() {
  const layout = document.querySelector<HTMLElement>('.game-layout[data-hub-tab]')
  if (!layout) return

  const setTab = (tab: HubTab) => {
    layout.dataset.hubTab = tab
    sessionStorage.setItem(HUB_TAB_STORAGE_KEY, tab)
    layout.querySelectorAll<HTMLElement>('[data-hub-tab-btn]').forEach((btn) => {
      const active = btn.dataset.hubTabBtn === tab
      btn.classList.toggle('is-active', active)
      btn.setAttribute('aria-selected', active ? 'true' : 'false')
    })
  }

  const saved = sessionStorage.getItem(HUB_TAB_STORAGE_KEY)
  setTab(isHubTab(saved) ? saved : 'map')

  layout.querySelectorAll<HTMLElement>('[data-hub-tab-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.hubTabBtn
      if (!isHubTab(raw)) return
      setTab(raw)
    })
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootHubTabs)
} else {
  bootHubTabs()
}
