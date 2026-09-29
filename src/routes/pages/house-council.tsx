import { GameSubpageShell } from '../../components/GameSocialNav'
import { SiteShell } from '../../components/SiteShell'
import { APPOINTABLE_HOUSE_ROLE_IDS, HOUSE_ROLES } from '../../config/game'
import type { HouseMessageWithAuthor } from '../../repositories/house-messages'
import type { HouseMemberRow } from '../../services/social'
import type { Character, House } from '../../types'

type UnitSummary = {
  id: string
  name: string
  isLeader: boolean
  memberNames: string[]
}

type HouseUnitOption = {
  id: string
  name: string
}

type HouseCouncilPageProps = {
  character: Character
  house: House
  messages: HouseMessageWithAuthor[]
  members: HouseMemberRow[]
  unit: UnitSummary | null
  houseUnits: HouseUnitOption[]
  error?: string | null
  notice?: string | null
}

export function HouseCouncilPage({
  character,
  house,
  messages,
  members,
  unit,
  houseUnits,
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
    <SiteShell title={`${house.name} 作戦会議 — 戦国日本史.net`}>
      <GameSubpageShell title={`${house.name} · 作戦会議`} active="house" error={error} notice={notice}>
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
            <h2 class="card-title">部隊編成</h2>
            <p class="hint">同じ部隊の武将は集合コマンドで合流できる。隊長が部隊を作る。</p>
            <div class="unit-actions">
              {unit ? (
                <>
                  <p class="status-badge">
                    所属「{unit.name}」{unit.isLeader ? '（隊長）' : '（隊員）'}
                  </p>
                  {unit.memberNames.length > 0 ? (
                    <p class="hint">メンバー: {unit.memberNames.join('、')}</p>
                  ) : null}
                  <form method="post" action="/actions/unit-leave">
                    <button type="submit" class="btn btn-ghost btn-small">
                      部隊を離脱
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <p class="hint">未所属。新編するか既存部隊へ参加。</p>
                  <form class="stack-form" method="post" action="/actions/unit-create">
                    <label class="field">
                      <span class="field-label">新部隊</span>
                      <input
                        class="field-input"
                        type="text"
                        name="unitName"
                        maxlength={12}
                        required
                        placeholder="部隊名"
                      />
                    </label>
                    <button type="submit" class="btn btn-ghost btn-small">
                      編成
                    </button>
                  </form>
                  {houseUnits.length > 0 ? (
                    <form class="stack-form" method="post" action="/actions/unit-join">
                      <label class="field">
                        <span class="field-label">参加</span>
                        <select class="field-input" name="unitId" required>
                          {houseUnits.map((u) => (
                            <option value={u.id} key={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button type="submit" class="btn btn-ghost btn-small">
                        参加
                      </button>
                    </form>
                  ) : null}
                </>
              )}
            </div>
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
            <h2 class="card-title">掲示板</h2>
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
