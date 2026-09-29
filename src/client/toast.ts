/** `?notice=` / `.game-notice` をトースト表示に移す */
function bootToast() {
  const stackId = 'toast-stack'
  let stack = document.getElementById(stackId)
  if (!stack) {
    stack = document.createElement('div')
    stack.id = stackId
    stack.className = 'toast-stack'
    stack.setAttribute('aria-live', 'polite')
    document.body.appendChild(stack)
  }

  const show = (message: string) => {
    const text = message.trim()
    if (!text || !stack) return
    const el = document.createElement('div')
    el.className = 'toast'
    el.textContent = text
    stack.appendChild(el)
    window.setTimeout(() => {
      el.classList.add('is-leaving')
      window.setTimeout(() => el.remove(), 280)
    }, 4200)
  }

  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('notice')
  if (fromQuery) show(fromQuery)

  document.querySelectorAll<HTMLElement>('.game-notice').forEach((node) => {
    const text = node.textContent?.trim() ?? ''
    if (text) show(text)
    node.hidden = true
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootToast)
} else {
  bootToast()
}
