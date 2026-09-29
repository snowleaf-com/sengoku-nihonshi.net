import { formatGameDate, formatRealtime } from '../config/calendar'
import { worldEventKindLabel } from '../services/events'
import type { WorldEvent, WorldEventKind } from '../types'

type EventFeedProps = {
  title: string
  events: WorldEvent[]
  empty?: string
  /** 戦/災/収などで絞り込める（知らせ向け） */
  filterable?: boolean
  subtitle?: string
}

const FILTER_OPTIONS: Array<{ kind: '' | WorldEventKind; label: string }> = [
  { kind: '', label: 'すべて' },
  { kind: 'war', label: '戦' },
  { kind: 'disaster', label: '災' },
  { kind: 'income', label: '収' },
  { kind: 'social', label: '人事' },
]

export function EventFeed({
  title,
  events,
  empty = '—',
  filterable = false,
  subtitle,
}: EventFeedProps) {
  return (
    <section class="event-feed" data-event-feed={filterable ? '1' : undefined}>
      <div class="event-feed-head">
        <div class="event-feed-titles">
          <h3 class="event-feed-title">{title}</h3>
          {subtitle ? <p class="event-feed-subtitle">{subtitle}</p> : null}
        </div>
        {filterable ? (
          <div class="event-feed-filters" role="group" aria-label="知らせの種類">
            {FILTER_OPTIONS.map((opt) => (
              <button
                type="button"
                class={`event-feed-filter${opt.kind === '' ? ' is-active' : ''}`}
                data-feed-kind={opt.kind}
                key={opt.kind || 'all'}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {events.length === 0 ? (
        <p class="event-feed-empty">{empty}</p>
      ) : (
        <ol class="event-feed-list">
          {events.map((event) => (
            <li
              class={`event-feed-item event-kind-${event.kind}`}
              data-event-kind={event.kind}
              key={event.id}
            >
              <time class="event-when" datetime={new Date(event.createdAt * 1000).toISOString()}>
                <span>{formatGameDate({ year: event.year, month: event.month })}</span>
                <span class="event-realtime">{formatRealtime(event.createdAt)}</span>
              </time>
              <span class="event-kind">{worldEventKindLabel(event.kind)}</span>
              <p class="event-message">{event.message}</p>
            </li>
          ))}
        </ol>
      )}
      {filterable ? (
        <p class="event-feed-empty event-feed-filtered-empty" hidden>
          この種類の知らせはない
        </p>
      ) : null}
    </section>
  )
}
