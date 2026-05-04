import TimelineEventCard from './TimelineEventCard'

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function dayKey(iso) {
  if (!iso) return 'sem-data'
  return iso.slice(0, 10)
}

function formatDayHeader(iso) {
  const d = new Date(iso + 'T00:00:00')
  const wd = WEEKDAYS[d.getDay()]
  return `${wd} · ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

export default function TimelineList({ events, projectId, photoEvents, onPhotoClick }) {
  if (events.length === 0) {
    return (
      <div className="empty-state">
        <p>Nenhum evento no período selecionado.</p>
      </div>
    )
  }

  // Group by day key (events arrive sorted desc).
  const groups = []
  let current = null
  for (const ev of events) {
    const k = dayKey(ev.occurred_at)
    if (!current || current.key !== k) {
      current = { key: k, events: [] }
      groups.push(current)
    }
    current.events.push(ev)
  }

  return (
    <div className="timeline-list">
      {groups.map(g => (
        <section key={g.key} className="timeline-day">
          <div className="timeline-day-header">{formatDayHeader(g.key)}</div>
          <div className="timeline-rail">
            {g.events.map(ev => {
              const handleClick = ev.kind === 'photo'
                ? () => {
                    const idx = photoEvents.findIndex(p => p.id === ev.id)
                    if (idx >= 0) onPhotoClick(idx)
                  }
                : undefined
              return (
                <TimelineEventCard
                  key={ev.id}
                  event={ev}
                  projectId={projectId}
                  onPhotoClick={handleClick}
                />
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
