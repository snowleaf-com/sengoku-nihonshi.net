/** 武将一覧の家（国）ブロック絞り込み */
function bootRankingFilter() {
  const select = document.querySelector('[data-ranking-filter]') as HTMLSelectElement | null
  if (!select) return

  const blocks = Array.from(
    document.querySelectorAll('[data-house-block]'),
  ) as HTMLElement[]
  if (blocks.length === 0) return

  const apply = () => {
    const value = select.value
    for (const block of blocks) {
      const house = block.dataset.houseBlock ?? ''
      block.hidden = value !== '' && house !== value
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
