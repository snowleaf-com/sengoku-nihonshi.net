/** コマンド用 dialog の開閉と、スマホ向けの一覧／選択／コマンドの切替 */
function bootCommandSheet() {
  const dialog = document.querySelector<HTMLDialogElement>('#command-sheet')
  const panel = document.querySelector<HTMLElement>('[data-command-queue]')

  const setPane = (pane: 'select' | 'queue' | 'pick') => {
    if (!panel) return
    panel.dataset.commandPane = pane
    panel.querySelectorAll<HTMLButtonElement>('[data-command-pane-tab]').forEach((tab) => {
      const active = tab.dataset.commandPaneTab === pane
      tab.classList.toggle('is-active', active)
      tab.setAttribute('aria-selected', active ? 'true' : 'false')
    })
  }

  if (panel) {
    setPane('queue')
    panel.querySelectorAll<HTMLButtonElement>('[data-command-pane-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const raw = tab.dataset.commandPaneTab
        const pane = raw === 'select' || raw === 'pick' ? raw : 'queue'
        setPane(pane)
      })
    })
  }

  const form = panel?.querySelector('form')
  form?.addEventListener('submit', () => {
    sessionStorage.setItem('command-sheet-pane', panel?.dataset.commandPane ?? 'queue')
  })

  if (!dialog) return

  const params = new URLSearchParams(window.location.search)
  if (params.get('commands') === '1') {
    const saved = sessionStorage.getItem('command-sheet-pane')
    const pane = saved === 'select' || saved === 'pick' ? saved : 'queue'
    setPane(pane)
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    params.delete('commands')
    const query = params.toString()
    const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', next)
  }
  sessionStorage.removeItem('command-sheet-pane')

  document.querySelectorAll<HTMLElement>('[data-open-commands]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setPane('queue')
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    })
  })

  document.querySelectorAll<HTMLElement>('[data-close-commands]').forEach((btn) => {
    btn.addEventListener('click', () => dialog.close())
  })

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCommandSheet)
} else {
  bootCommandSheet()
}
