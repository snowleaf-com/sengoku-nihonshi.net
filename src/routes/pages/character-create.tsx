import { EnterPathPanel } from '../../components/EnterPathPanel'
import { ProvinceMap } from '../../components/ProvinceMap'
import { SiteShell } from '../../components/SiteShell'
import type { House, Province } from '../../types'

type CharacterCreatePageProps = {
  error?: string | null
  provinces: Province[]
  houses: House[]
  previewColor: string
}

export function CharacterCreatePage({
  error,
  provinces,
  houses,
  previewColor,
}: CharacterCreatePageProps) {
  return (
    <SiteShell title="武将作成 — 戦国日本史.net">
      <form class="game-layout" method="post" action="/actions/character">
        <section class="game-status">
          <h1>武将作成</h1>
          <p class="panel-lead">名を入れ、地図で国を選ぶ。中立は建国、支配国は仕官。</p>

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

          <div id="enter-path-panel">
            <EnterPathPanel mode="idle" />
          </div>

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
            pickSwapTarget="#enter-path-panel"
            pickSwapPath="/game/fragments/enter-path"
          />
        </section>
      </form>

      <form id="logout-form" method="post" action="/auth/logout" hidden></form>
    </SiteShell>
  )
}
