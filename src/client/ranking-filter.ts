/** 武将一覧の家フィルタ */
function bootRankingFilter() {
  const select = document.querySelector('[data-ranking-filter]') as HTMLSelectElement | null
  const table = document.querySelector('[data-ranking-table]') as HTMLTableElement | null
  if (!select || !table) return

  const rows = Array.from(table.querySelectorAll('tbody tr[data-house]')) as HTMLTableRowElement[]

  const apply = () => {
    const value = select.value
    for (const row of rows) {
      const house = row.dataset.house ?? ''
      row.hidden = value !== '' && house !== value
    }
  }

  select.addEventListener('change', apply)
  apply()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootRankingFilter)
} else {
  bootRankingFilter()
}
