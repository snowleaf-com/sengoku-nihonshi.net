import type { Child } from 'hono/jsx'
import { GameChromeMenu } from './GameChromeMenu'

type GameSubpageShellProps = {
  title: string
  active: 'house' | 'letters' | 'ranking' | 'titles'
  error?: string | null
  notice?: string | null
  /** 一覧系など、中央フレームを少し広げる */
  wide?: boolean
  children?: Child
}

export function GameSubpageShell({
  title,
  active,
  error = null,
  notice = null,
  wide = false,
  children,
}: GameSubpageShellProps) {
  return (
    <div class={`game-app${wide ? ' is-wide' : ''}`}>
      <GameChromeMenu active={active} />
      <div class="game-layout game-subpage">
        <header class="game-top">
          <h1 class="game-subpage-title">{title}</h1>
          <div class="game-top-actions">
            <a class="btn btn-ghost btn-small btn-touch" href="/game">
              Hubへ
            </a>
          </div>
        </header>
        {error ? <p class="hero-error game-error">{error}</p> : null}
        {notice ? <p class="hint game-notice">{notice}</p> : null}
        <div class="game-subpage-body">{children}</div>
      </div>
    </div>
  )
}
