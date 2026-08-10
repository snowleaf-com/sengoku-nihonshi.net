import { SiteShell } from '../../components/SiteShell'

export function HomePage() {
  return (
    <SiteShell>
      <section class="hero">
        <h1 class="hero-title">戦国日本史.net</h1>
        <p class="hero-lead">天下統一を目指せ。</p>

        <div class="hero-actions">
          <button
            type="button"
            class="btn btn-primary"
            id="passkey-register"
            data-passkey-action="register"
          >
            パスキーで始める
          </button>

          <p class="hero-sub">すでに武将をお持ちですか？</p>
          <a class="btn btn-ghost" href="/login">
            ログイン
          </a>
        </div>

        <p class="hero-error" id="passkey-error" hidden></p>
      </section>
    </SiteShell>
  )
}
