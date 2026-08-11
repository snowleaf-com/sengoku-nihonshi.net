import { CHARACTER_ICON_IDS, iconPublicPath } from '../../config/icons'
import { CHARACTER_NAME_MAX_LENGTH } from '../../lib/character-name'
import { SiteShell } from '../../components/SiteShell'
import type { Character, User } from '../../types'

type GamePageProps = {
  user: User
  character: Character | null
  error?: string | null
}

/**
 * 武将未作成: 名前 + アイコン選択。
 * 武将作成済: 入口プレースホルダ（マップ等は後続フェーズ）。
 */
export function GamePage({ user, character, error }: GamePageProps) {
  if (!character) {
    return (
      <SiteShell title="武将作成 — 戦国日本史.net">
        <section class="panel panel-wide">
          <h1>武将を立てる</h1>
          <p class="panel-lead">名前と顔を選んで、戦国の世へ踏み出せ。</p>

          {error ? <p class="form-error">{errorMessage(error)}</p> : null}

          <form method="post" action="/game/character" class="character-form">
            <label class="field">
              <span class="field-label">武将名</span>
              <input
                type="text"
                name="name"
                required
                maxlength={CHARACTER_NAME_MAX_LENGTH}
                autocomplete="nickname"
                placeholder="例: 織田信長"
              />
            </label>

            <fieldset class="field">
              <legend class="field-label">アイコン</legend>
              <div class="icon-grid" role="list">
                {CHARACTER_ICON_IDS.map((iconId, index) => (
                  <label class="icon-option" role="listitem">
                    <input
                      type="radio"
                      name="iconId"
                      value={iconId}
                      required
                      checked={index === 0}
                    />
                    <img
                      src={iconPublicPath(iconId)}
                      alt={`武将アイコン ${iconId.replace('busho_', '')}`}
                      width="72"
                      height="72"
                      loading="lazy"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <button type="submit" class="btn btn-primary">
              戦国の世へ
            </button>
          </form>

          <form method="post" action="/auth/logout" class="logout-form">
            <button type="submit" class="btn btn-ghost">
              ログアウト
            </button>
          </form>
        </section>
      </SiteShell>
    )
  }

  return (
    <SiteShell title={`${character.name} — 戦国日本史.net`}>
      <section class="panel">
        <h1>出陣準備</h1>
        <p class="panel-lead">武将が立ちました。国取りは次のフェーズで。</p>

        <div class="character-card">
          <img
            class="character-portrait"
            src={iconPublicPath(character.iconId)}
            alt=""
            width="96"
            height="96"
          />
          <dl class="meta">
            <div>
              <dt>武将名</dt>
              <dd>{character.name}</dd>
            </div>
            <div>
              <dt>ユーザー ID</dt>
              <dd>
                <code>{user.id}</code>
              </dd>
            </div>
          </dl>
        </div>

        <form method="post" action="/auth/logout">
          <button type="submit" class="btn btn-ghost">
            ログアウト
          </button>
        </form>
      </section>
    </SiteShell>
  )
}

function errorMessage(code: string): string {
  switch (code) {
    case 'invalid_name':
      return `武将名は1〜${CHARACTER_NAME_MAX_LENGTH}文字で入力してください。`
    case 'invalid_icon':
      return 'アイコンを選択してください。'
    case 'already_exists':
      return 'すでに武将を作成済みです。'
    default:
      return '作成に失敗しました。もう一度お試しください。'
  }
}
