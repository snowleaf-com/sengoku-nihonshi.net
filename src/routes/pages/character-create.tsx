import { EnterPathPanel } from '../../components/EnterPathPanel'
import { ProvinceMap } from '../../components/ProvinceMap'
import { SiteShell } from '../../components/SiteShell'
import { CHARACTER_ICONS, iconPublicPath } from '../../config/icons'
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
      <form class="create-layout" method="post" action="/actions/character">
        <section class="create-panel create-identity">
          <header class="create-header">
            <h1>武将作成</h1>
            <p class="panel-lead">名と顔を選び、地図で国を選ぶ。中立は建国、支配国は仕官。</p>
          </header>

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

          <fieldset class="icon-picker">
            <legend class="field-label">顔・立ち位置</legend>
            <div class="icon-grid" role="list">
              {CHARACTER_ICONS.map((icon, index) => (
                <label class="icon-option" role="listitem" title={icon.label}>
                  <input
                    type="radio"
                    name="iconId"
                    value={icon.id}
                    required
                    checked={index === 0}
                  />
                  <span class="icon-option-face">
                    <img
                      src={iconPublicPath(icon.id)}
                      alt={icon.label}
                      width="64"
                      height="64"
                      loading="lazy"
                    />
                    <span class="icon-option-label">{icon.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div id="enter-path-panel" class="create-path">
            <EnterPathPanel mode="idle" />
          </div>

          <div class="logout-inline">
            <button type="submit" class="btn btn-ghost" form="logout-form">
              ログアウト
            </button>
          </div>
        </section>

        <section class="create-panel create-map">
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
