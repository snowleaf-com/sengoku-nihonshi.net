import { GameSubpageShell } from '../../components/GameSocialNav'
import { SiteShell } from '../../components/SiteShell'
import type { InboxLetter } from '../../repositories/personal-letters'
import type { Character } from '../../types'

type LettersPageProps = {
  character: Character
  letters: InboxLetter[]
  recipients: Character[]
  error?: string | null
  notice?: string | null
}

export function LettersPage({
  character,
  letters,
  recipients,
  error = null,
  notice = null,
}: LettersPageProps) {
  const timeFmt: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }

  return (
    <SiteShell title={`手紙 — ${character.name}`}>
      <GameSubpageShell title="個人宛て手紙" active="letters" error={error} notice={notice}>
        <div class="game-subpage-grid">
          <section class="game-panel">
            <h2 class="card-title">手紙を送る</h2>
            <form class="stack-form" method="post" action="/game/letters">
              <label class="field">
                <span class="field-label">宛先</span>
                <select class="field-input" name="toCharacterId" required>
                  <option value="">武将を選択</option>
                  {recipients.map((r) => (
                    <option value={r.id}>
                      {r.name}
                      {r.houseId === character.houseId && character.houseId
                        ? '（同家）'
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label class="field">
                <span class="field-label">本文（1〜200文字）</span>
                <textarea
                  class="field-input"
                  name="body"
                  rows={4}
                  maxlength={200}
                  required
                />
              </label>
              <button type="submit" class="btn btn-primary">
                送信
              </button>
            </form>
          </section>

          <section class="game-panel">
            <h2 class="card-title">受信箱</h2>
            <ul class="message-list">
              {letters.length === 0 ? (
                <li class="hint">手紙はまだない</li>
              ) : (
                letters.map((letter) => (
                  <li class="message-item">
                    <div class="message-meta">
                      <strong>{letter.fromName}</strong>
                      <time>
                        {new Date(letter.createdAt * 1000).toLocaleString('ja-JP', timeFmt)}
                      </time>
                    </div>
                    <p class="message-body">{letter.body}</p>
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
