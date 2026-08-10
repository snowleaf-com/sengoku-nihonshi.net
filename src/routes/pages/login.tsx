import { SiteShell } from '../../components/SiteShell'

export function LoginPage() {
  return (
    <SiteShell title="ログイン — 戦国日本史.net">
      <section class="hero">
        <h1 class="hero-title">ログイン</h1>
        <p class="hero-lead">登録済みのパスキーで入ります。</p>

        <div class="hero-actions">
          <button
            type="button"
            class="btn btn-primary"
            id="passkey-login"
            data-passkey-action="login"
          >
            パスキーでログイン
          </button>
          <a class="btn btn-ghost" href="/">
            トップへ戻る
          </a>
        </div>

        <p class="hero-error" id="passkey-error" hidden></p>
      </section>
    </SiteShell>
  )
}
