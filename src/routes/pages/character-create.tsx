import { ProvinceMap } from '../../components/ProvinceMap'
import { SiteShell } from '../../components/SiteShell'
import type { House, Province } from '../../types'

type CharacterCreatePageProps = {
  error?: string | null
  provinces: Province[]
  houses: House[]
  previewColor: string
  hasNeutral: boolean
}

export function CharacterCreatePage({
  error,
  provinces,
  houses,
  previewColor,
  hasNeutral,
}: CharacterCreatePageProps) {
  return (
    <SiteShell title="武将作成 — 戦国日本史.net">
      {!hasNeutral ? (
        <section class="panel">
          <h1>武将作成</h1>
          <p class="hint">いま入城できる中立国がありません。</p>
          <form method="post" action="/auth/logout" class="logout-inline">
            <button type="submit" class="btn btn-ghost">
              ログアウト
            </button>
          </form>
        </section>
      ) : (
        <form class="game-layout" method="post" action="/actions/character">
          <section class="game-status">
            <h1>武将作成</h1>
            <p class="panel-lead">名を入れ、地図の中立国を選んで立て。</p>

            {error ? <p class="hero-error">{error}</p> : null}

            <label class="field">
              <span class="field-label">武将名</span>
              <input
                class="field-input"
                type="text"
                name="name"
                maxlength={12}
                required
                autocomplete="nickname"
                placeholder="例: 雪月"
              />
            </label>
            <p class="hint">地図の灰色（中立）をクリックして選ぶ。選んだ国は家の色になる。</p>
            <button type="submit" class="btn btn-primary">
              戦国の世へ
            </button>

            <div class="logout-inline">
              <button type="submit" class="btn btn-ghost" form="logout-form">
                ログアウト
              </button>
            </div>
          </section>

          <section class="game-map-section">
            <h2>初期位置</h2>
            <ProvinceMap
              mode="pick"
              provinces={provinces}
              houses={houses}
              previewColor={previewColor}
              inputName="provinceId"
            />
          </section>
        </form>
      )}

      <form id="logout-form" method="post" action="/auth/logout" hidden></form>
    </SiteShell>
  )
}
