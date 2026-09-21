import { SiteShell } from '../../components/SiteShell'

type AdminPageProps = {
  authorized: boolean
  secret: string
  maintenance: number
  year: number | null
  month: number | null
  error?: string | null
  notice?: string | null
}

export function AdminPage({
  authorized,
  secret,
  maintenance,
  year,
  month,
  error = null,
  notice = null,
}: AdminPageProps) {
  return (
    <SiteShell title="管理 — 戦国日本史.net">
      <section class="game-panel" style="max-width:28rem;margin:2rem auto">
        <h1>管理</h1>
        {error ? <p class="hero-error">{error}</p> : null}
        {notice ? <p class="hint">{notice}</p> : null}

        {!authorized ? (
          <form class="stack-form" method="get" action="/admin">
            <p class="hint">ADMIN_SECRET を入力してください</p>
            <label class="field">
              <span class="field-label">秘密</span>
              <input class="field-input" type="password" name="secret" required />
            </label>
            <button type="submit" class="btn btn-primary">
              入室
            </button>
          </form>
        ) : (
          <>
            <dl class="meta meta-inline">
              <div>
                <dt>年月</dt>
                <dd>
                  {year}年{month}月
                </dd>
              </div>
              <div>
                <dt>メンテ</dt>
                <dd>{maintenance ? 'ON' : 'OFF'}</dd>
              </div>
            </dl>
            <form class="stack-form" method="post" action="/admin">
              <input type="hidden" name="secret" value={secret} />
              <button
                type="submit"
                class="btn btn-primary"
                name="intent"
                value="toggle_maintenance"
              >
                メンテを切替
              </button>
              <button
                type="submit"
                class="btn btn-ghost"
                name="intent"
                value="advance_turn"
              >
                ターン強制進行
              </button>
            </form>
          </>
        )}
      </section>
    </SiteShell>
  )
}
