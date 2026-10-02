import type { CityRank } from '../config/provinces'

/** ランクは形で区別する。色には頼らない。 */
export function CityGlyph({ rank }: { rank: CityRank }) {
  if (rank === 'great') {
    return (
      <svg class="city-glyph is-great" viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M1 15h14v-1.6H1zM2.2 13.4V8.2h2.2v5.2H2.2zM6.2 13.4V4.2h3.6v9.2H6.2zM11.6 13.4V7.4h2.2v6h-2.2zM6.2 4.2h3.6L8 1.6z"
        />
      </svg>
    )
  }
  if (rank === 'mid') {
    return (
      <svg class="city-glyph is-mid" viewBox="0 0 16 16" aria-hidden="true">
        <path fill="currentColor" d="M2 15h12v-1.6H2zM5.4 13.4V6.4h5.2v7H5.4zM5.4 6.4h5.2L8 3.2z" />
      </svg>
    )
  }
  return (
    <svg class="city-glyph is-town" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M1 14.5h6.2L6.4 10H1.8zM8.2 14.5H15l-.8-3.6H9zM1.6 9.6h4.8L4 6.2zM9 10.2h4.6L11.3 7z"
      />
    </svg>
  )
}

export function PortAnchor() {
  return (
    <svg class="port-anchor" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="3" r="1.5" fill="currentColor" />
      <path
        d="M8 4.6v7.2M5.2 7.2h5.6M8 11.8c-2.5 0-3.8-1.5-3.8-3.4M8 11.8c2.5 0 3.8-1.5 3.8-3.4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </svg>
  )
}
