import { GameSubpageShell } from '../../components/GameSocialNav'
import { SiteShell } from '../../components/SiteShell'
import { APPOINTABLE_HOUSE_ROLE_IDS, HOUSE_ROLES } from '../../config/game'
import type { HouseMessageWithAuthor } from '../../repositories/house-messages'
import type { HouseMemberRow } from '../../services/social'
import type { Character, House } from '../../types'

type HouseCouncilPageProps = {
  character: Character
  house: House
  messages: HouseMessageWithAuthor[]
  members: HouseMemberRow[]
  error?: string | null
  notice?: string | null
}

export function HouseCouncilPage({
  character,
  house,
  messages,
  members,
  error = null,
  notice = null,
}: HouseCouncilPageProps) {
  const isLord = house.leaderCharacterId === character.id
  const appointTargets = members.filter((m) => !m.isLord)
  const timeFmt: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }

  return (
    <SiteShell title={`${house.name} 会議室 — 戦国日本史.net`}>
      <GameSubpageShell title={`${house.name} · 国会議室`} active="house" error={error} notice={notice}>
        <div class="game-subpage-grid">
          <section class="game-panel">
            <h2 class="card-title">国法</h2>
            {isLord ? (
              <form class="stack-form" method="post" action="/game/house">
                <input type="hidden" name="intent" value="law" />
                <label class="field">
                  <span class="field-label">国法（当主のみ編集）</span>
                  <textarea
                    class="field-input"
                    name="lawText"
                    rows={6}
                    maxlength={2000}
                  >
                    {house.lawText}
                  </textarea>
                </label>
                <button type="submit" class="btn btn-primary">
                  国法を更新
                </button>
              </form>
            ) : (
              <p class="law-text">{house.lawText || '（まだ国法はない）'}</p>
            )}
          </section>

          <section class="game-panel">
            <h2 class="card-title">家中</h2>
            <ul class="member-list">
              {members.map((m) => (
                <li class="member-item">
                  <strong>{m.name}</strong>
                  <span class="member-role">{m.roleLabel}</span>
                </li>
              ))}
            </ul>
            {isLord ? (
              <form class="stack-form appoint-form" method="post" action="/game/house">
                <input type="hidden" name="intent" value="appoint" />
                <h3 class="card-subtitle">任命（称号）</h3>
                <p class="hint">軍師・大将は家に1人まで。ゲーム効果はなく表示のみ。</p>
                <label class="field">
                  <span class="field-label">武将</span>
                  <select class="field-input" name="targetCharacterId" required>
                    <option value="">選択</option>
                    {appointTargets.map((m) => (
                      <option value={m.characterId}>
                        {m.name}（{m.roleLabel}）
                      </option>
                    ))}
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">役職</span>
                  <select class="field-input" name="roleId" required>
                    {APPOINTABLE_HOUSE_ROLE_IDS.map((id) => (
                      <option value={id}>{HOUSE_ROLES[id]}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={appointTargets.length === 0}
                >
                  任命する
                </button>
              </form>
            ) : null}
          </section>

          <section class="game-panel">
            <h2 class="card-title">会議室</h2>
            <form class="stack-form" method="post" action="/game/house">
              <input type="hidden" name="intent" value="message" />
              <label class="field">
                <span class="field-label">発言（1〜200文字）</span>
                <textarea
                  class="field-input"
                  name="body"
                  rows={3}
                  maxlength={200}
                  required
                  placeholder="家臣への連絡など"
                />
              </label>
              <button type="submit" class="btn btn-primary">
                投稿
              </button>
            </form>

            <ul class="message-list">
              {messages.length === 0 ? (
                <li class="hint">まだ発言はない</li>
              ) : (
                messages.map((m) => (
                  <li class="message-item">
                    <div class="message-meta">
                      <strong>{m.authorName}</strong>
                      <time>
                        {new Date(m.createdAt * 1000).toLocaleString('ja-JP', timeFmt)}
                      </time>
                    </div>
                    <p class="message-body">{m.body}</p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </GameSubpageShell>
    </SiteShell>
  )
}
