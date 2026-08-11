import { EnterPathPanel } from '../../components/EnterPathPanel'
import { ProvinceMap } from '../../components/ProvinceMap'
import { SiteShell } from '../../components/SiteShell'
import { StatAdjustPanel } from '../../components/StatAdjustPanel'
import { ARCHETYPES, defaultStatsForArchetype } from '../../config/archetypes'
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
  const defaultArchetype = ARCHETYPES.find((a) => a.id === 'domestic') ?? ARCHETYPES[0]
  const defaultStats = defaultStatsForArchetype(defaultArchetype.id)

  return (
    <SiteShell title="武将作成 — 戦国日本史.net">
      <form class="create-layout" method="post" action="/actions/character">
        <section class="create-panel create-identity">
          <header class="create-header">
            <h1>武将作成</h1>
            <p class="panel-lead">名と顔と立ち回りを選び、能力を整え、地図で国を選ぶ。</p>
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

          <fieldset class="archetype-picker">
            <legend class="field-label">立ち回り</legend>
            <div class="archetype-grid" role="list">
              {ARCHETYPES.map((archetype) => (
                <label class="archetype-option" role="listitem">
                  <input
                    type="radio"
                    name="archetypeId"
                    value={archetype.id}
                    required
                    checked={archetype.id === defaultArchetype.id}
                    hx-get={`/game/fragments/stat-adjust?archetypeId=${archetype.id}`}
                    hx-target="#stat-adjust-panel"
                    hx-trigger="change"
                    hx-swap="innerHTML"
                  />
                  <span class="archetype-card">
                    <span class="archetype-name">{archetype.label}</span>
                    <span class="archetype-blurb">{archetype.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div id="stat-adjust-panel">
            <StatAdjustPanel stats={defaultStats} />
          </div>

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
