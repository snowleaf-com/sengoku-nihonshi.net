type SelectMode = 'all' | 'odd' | 'even' | 'none'

function queueBoxes(root: HTMLElement): HTMLInputElement[] {
  return Array.from(
    root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="positions"]'),
  )
}

function selectedCount(root: HTMLElement): number {
  return queueBoxes(root).filter((box) => box.checked).length
}

function setStatus(root: HTMLElement, message: string | null) {
  const status = root.querySelector<HTMLElement>('[data-command-status]')
  if (!status) return
  if (message) {
    status.textContent = message
    status.classList.add('is-visible')
  } else {
    status.textContent = ''
    status.classList.remove('is-visible')
  }
}

function updateSelectedCount(root: HTMLElement) {
  const count = selectedCount(root)
  const label = root.querySelector<HTMLElement>('[data-queue-selected-count]')
  if (label) label.textContent = String(count)
  root.dataset.selectedCount = String(count)
  root.classList.toggle('has-selection', count > 0)
  if (count > 0) setStatus(root, null)
}

function applySelection(root: HTMLElement, mode: SelectMode) {
  const boxes = queueBoxes(root)
  for (const box of boxes) {
    const index = Number.parseInt(box.dataset.queueIndex ?? '', 10)
    if (!Number.isFinite(index)) continue
    if (mode === 'all') box.checked = true
    else if (mode === 'none') box.checked = false
    else if (mode === 'odd') box.checked = index % 2 === 1
    else if (mode === 'even') box.checked = index % 2 === 0
  }
  updateSelectedCount(root)
}

function applyMonthSelection(root: HTMLElement, month: number) {
  for (const box of queueBoxes(root)) {
    const slotMonth = Number.parseInt(box.dataset.queueMonth ?? '', 10)
    box.checked = slotMonth === month
  }
  updateSelectedCount(root)
}

function applySearchSelection(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-queue-search]')
  const query = (input?.value ?? '').trim()
  if (!query) {
    flashQueue(root)
    setStatus(root, '検索する文字列を入れてください')
    return
  }
  let matched = 0
  for (const box of queueBoxes(root)) {
    const label = box.dataset.queueLabel ?? ''
    const hit = label.includes(query)
    box.checked = hit
    if (hit) matched += 1
  }
  updateSelectedCount(root)
  if (matched === 0) {
    flashQueue(root)
    setStatus(root, `「${query}」に一致する枠はない`)
  }
}

function readPositiveInt(input: HTMLInputElement | null, fallback: number): number | null {
  const raw = (input?.value ?? '').trim()
  if (!raw) return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value < 1) return null
  return value
}

function applyRangeSelection(root: HTMLElement) {
  const fromInput = root.querySelector<HTMLInputElement>('[data-queue-from]')
  const stepInput = root.querySelector<HTMLInputElement>('[data-queue-step]')
  const toInput = root.querySelector<HTMLInputElement>('[data-queue-to]')
  const max = queueBoxes(root).length

  const from = readPositiveInt(fromInput, 1)
  const step = readPositiveInt(stepInput, 1)
  const to = readPositiveInt(toInput, max)

  if (from === null || step === null || to === null) {
    flashQueue(root)
    setStatus(root, '範囲は1以上の整数で指定してください')
    return
  }
  if (from > to) {
    flashQueue(root)
    setStatus(root, '開始番号は終了番号以下にしてください')
    return
  }

  const selected = new Set<number>()
  for (let n = from; n <= to; n += step) selected.add(n)

  for (const box of queueBoxes(root)) {
    const index = Number.parseInt(box.dataset.queueIndex ?? '', 10)
    box.checked = selected.has(index)
  }
  updateSelectedCount(root)
}

function flashQueue(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('[data-queue-list]')
  if (!list) return
  list.classList.remove('is-flash')
  void list.offsetWidth
  list.classList.add('is-flash')
}

function isToolField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      '[data-queue-search], [data-queue-from], [data-queue-step], [data-queue-to]',
    ),
  )
}

function bindRoot(root: HTMLElement) {
  if (root.dataset.queueBound === '1') return
  root.dataset.queueBound = '1'

  root.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    const modeButton = target.closest<HTMLElement>('[data-queue-select]')
    if (modeButton && root.contains(modeButton)) {
      const mode = modeButton.dataset.queueSelect as SelectMode | undefined
      if (!mode) return
      event.preventDefault()
      applySelection(root, mode)
      return
    }

    const monthButton = target.closest<HTMLElement>('[data-queue-select-month]')
    if (monthButton && root.contains(monthButton)) {
      const month = Number.parseInt(monthButton.dataset.queueSelectMonth ?? '', 10)
      if (!Number.isFinite(month) || month < 1 || month > 12) return
      event.preventDefault()
      applyMonthSelection(root, month)
      return
    }

    if (target.closest('[data-queue-select-search]') && root.contains(target)) {
      event.preventDefault()
      applySearchSelection(root)
      return
    }

    if (target.closest('[data-queue-select-range]') && root.contains(target)) {
      event.preventDefault()
      applyRangeSelection(root)
    }
  })

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    if (!isToolField(event.target)) return
    event.preventDefault()
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (target.matches('[data-queue-search]')) applySearchSelection(root)
    else applyRangeSelection(root)
  })

  root.addEventListener('change', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    if (target.name !== 'positions') return
    updateSelectedCount(root)
  })

  root.addEventListener('submit', (event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return
    const submitter = (event as SubmitEvent).submitter
    if (!(submitter instanceof HTMLElement)) return
    if (!submitter.hasAttribute('data-needs-selection')) return
    if (selectedCount(root) > 0) return
    event.preventDefault()
    flashQueue(root)
    setStatus(root, '先に左側の枠を選んでください')
  })

  updateSelectedCount(root)
}

function boot() {
  for (const root of Array.from(document.querySelectorAll<HTMLElement>('[data-command-queue]'))) {
    bindRoot(root)
  }
}

document.addEventListener('DOMContentLoaded', boot)
document.body.addEventListener('htmx:afterSwap', ((event: CustomEvent) => {
  const target = event.detail?.target
  if (!(target instanceof HTMLElement)) return
  const roots = [
    ...(target.matches('[data-command-queue]') ? [target] : []),
    ...Array.from(target.querySelectorAll<HTMLElement>('[data-command-queue]')),
  ]
  for (const root of roots) bindRoot(root)
}) as EventListener)
