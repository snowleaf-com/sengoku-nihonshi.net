/** コマンド用 dialog の開閉 */
function bootCommandSheet() {
  const dialog = document.querySelector<HTMLDialogElement>('#command-sheet')
  if (!dialog) return

  document.querySelectorAll<HTMLElement>('[data-open-commands]').forEach((btn) => {
    btn.addEventListener('click', () => {
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
