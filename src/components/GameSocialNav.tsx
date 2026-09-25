import type { Child } from 'hono/jsx'

type GameSocialNavProps = {
  active: 'hub' | 'house' | 'letters' | 'ranking' | 'titles'
}

export function GameSocialNav({ active }: GameSocialNavProps) {
  return (
    <nav class="game-subnav" aria-label="社会">
      <a class={active === 'hub' ? 'is-active' : undefined} href="/game">
        Hub
      </a>
      <a class={active === 'house' ? 'is-active' : undefined} href="/game/house">
        会議室
      </a>
      <a class={active === 'letters' ? 'is-active' : undefined} href="/game/letters">
        手紙
      </a>
      <a class={active === 'ranking' ? 'is-active' : undefined} href="/game/ranking">
        武将一覧
      </a>
      <a class={active === 'titles' ? 'is-active' : undefined} href="/game/titles">
        名称一覧
      </a>
    </nav>
  )
}

type GameSubpageShellProps = {
  title: string
  active: 'house' | 'letters' | 'ranking' | 'titles'
  error?: string | null
  notice?: string | null
  children?: Child
}

export function GameSubpageShell({
  title,
  active,
  error = null,
  notice = null,
  children,
}: GameSubpageShellProps) {
  return (
    <div class="game-layout game-subpage">
      <header class="game-top">
        <h1 class="game-subpage-title">{title}</h1>
        <div class="game-top-actions">
          <GameSocialNav active={active} />
          <form method="post" action="/auth/logout">
            <button type="submit" class="btn btn-ghost btn-small">
              ログアウト
            </button>
          </form>
        </div>
      </header>
      {error ? <p class="hero-error game-error">{error}</p> : null}
      {notice ? <p class="hint game-notice">{notice}</p> : null}
      {children}
    </div>
  )
}
