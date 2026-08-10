import { SiteShell } from '../../components/SiteShell'
import type { User } from '../../types'

type GamePageProps = {
  user: User
}

/**
 * Phase 0: 武将作成前画面のプレースホルダ。
 * Phase 1 で武将名入力 → 戦国の世へ、を実装する。
 */
export function GamePage({ user }: GamePageProps) {
  return (
    <SiteShell title="武将作成前 — 戦国日本史.net">
      <section class="panel">
        <h1>武将作成前</h1>
        <p class="panel-lead">
          パスキー認証が完了しました。次のフェーズで武将を立てます。
        </p>

        <dl class="meta">
          <div>
            <dt>ユーザー ID</dt>
            <dd>
              <code>{user.id}</code>
            </dd>
          </div>
          <div>
            <dt>最終ログイン</dt>
            <dd>{formatEpoch(user.lastLoginAt)}</dd>
          </div>
        </dl>

        <form method="post" action="/auth/logout">
          <button type="submit" class="btn btn-ghost">
            ログアウト
          </button>
        </form>
      </section>
    </SiteShell>
  )
}

function formatEpoch(value: number | null): string {
  if (!value) return '—'
  return new Date(value * 1000).toLocaleString('ja-JP')
}
