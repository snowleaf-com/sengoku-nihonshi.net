/** コマンド用 dialog の開閉と、スマホ向けの予約枠／入力の切替 */
function bootCommandSheet() {
  const dialog = document.querySelector<HTMLDialogElement>('#command-sheet')
  const panel = document.querySelector<HTMLElement>('[data-command-queue]')

  const setPane = (pane: 'queue' | 'pick') => {
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
        const pane = tab.dataset.commandPaneTab === 'pick' ? 'pick' : 'queue'
        setPane(pane)
      })
    })
  }

  if (!dialog) return

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
