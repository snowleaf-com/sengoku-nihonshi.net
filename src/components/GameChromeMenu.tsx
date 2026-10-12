type GameChromeMenuProps = {
  active: 'hub' | 'house' | 'letters' | 'ranking' | 'titles'
  showHubHomePref?: boolean
  showAdvanceTurn?: boolean
}

export function GameChromeMenu({
  active,
  showHubHomePref = false,
  showAdvanceTurn = false,
}: GameChromeMenuProps) {
  return (
    <details class="game-chrome-menu">
      <summary class="game-chrome-menu-toggle" aria-label="メニュー">
        <span class="game-chrome-menu-icon" aria-hidden="true" />
      </summary>
      <div class="game-chrome-menu-panel">
        <nav class="game-chrome-nav" aria-label="ゲームメニュー">
          <a class={active === 'hub' ? 'is-active' : undefined} href="/game">
            Hub
          </a>
          <a class={active === 'house' ? 'is-active' : undefined} href="/game/house">
            作戦会議
          </a>
          <a class={active === 'letters' ? 'is-active' : undefined} href="/game/letters">
            手紙
          </a>
          <a class={active === 'ranking' ? 'is-active' : undefined} href="/game/ranking">
            武将一覧
          </a>
          <a class={active === 'titles' ? 'is-active' : undefined} href="/game/titles">
            名将一覧
          </a>
        </nav>

        {showHubHomePref ? (
          <div class="game-chrome-section" role="group" aria-label="トップ画面">
            <p class="game-chrome-section-label">トップ画面</p>
            <div class="hub-home-pref-menu">
              <button type="button" data-hub-home-set="map">
                地図
              </button>
              <button type="button" data-hub-home-set="self">
                自身
              </button>
              <button type="button" data-hub-home-set="results">
                結果
              </button>
              <button type="button" data-hub-home-set="news">
                知らせ
              </button>
            </div>
          </div>
        ) : null}

        <div class="game-chrome-actions">
          <a href="/game">更新</a>
          {showAdvanceTurn ? (
            <form method="post" action="/actions/advance-turn">
              <button type="submit">ターン進行</button>
            </form>
          ) : null}
          <form method="post" action="/auth/logout">
            <button type="submit">ログアウト</button>
          </form>
        </div>
      </div>
    </details>
  )
}
