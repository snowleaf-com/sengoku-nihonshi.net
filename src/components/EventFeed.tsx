import { formatGameDate } from '../config/calendar'
import { worldEventKindLabel } from '../services/events'
import type { WorldEvent } from '../types'

type EventFeedProps = {
  title: string
  events: WorldEvent[]
  empty?: string
}

export function EventFeed({ title, events, empty = '—' }: EventFeedProps) {
  return (
    <section class="event-feed">
      <h3 class="event-feed-title">{title}</h3>
      {events.length === 0 ? (
        <p class="event-feed-empty">{empty}</p>
      ) : (
        <ol class="event-feed-list">
          {events.map((event) => (
            <li class={`event-feed-item event-kind-${event.kind}`} key={event.id}>
              <time class="event-when">
                {formatGameDate({ year: event.year, month: event.month })}
              </time>
              <span class="event-kind">{worldEventKindLabel(event.kind)}</span>
              <p class="event-message">{event.message}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
