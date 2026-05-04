export default function Gallery({ photoEvents, onPhotoClick }) {
  if (photoEvents.length === 0) {
    return (
      <div className="empty-state">
        <p>Nenhuma foto no período selecionado.</p>
      </div>
    )
  }
  return (
    <div className="photo-masonry">
      {photoEvents.map((ev, idx) => {
        const p = ev.payload
        return (
          <button
            key={ev.id}
            type="button"
            className="photo-item"
            onClick={() => onPhotoClick(idx)}
            style={{ animationDelay: `${idx * 0.03}s`, all: 'unset', cursor: 'pointer' }}
          >
            <img src={p.url} alt={p.description || ''} loading="lazy" />
            {(p.description || ev.occurred_at) && (
              <div className="photo-caption">
                {p.description && (
                  <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                    {p.description}
                  </p>
                )}
                {ev.occurred_at && (
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    {new Date(ev.occurred_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
