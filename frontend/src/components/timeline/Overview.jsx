import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutList, Image as ImageIcon } from 'lucide-react'
import { project } from '../../api/client'
import { useToast } from '../Toast'
import TimelineFilters, { KIND_META } from './TimelineFilters'
import TimelineList from './TimelineList'
import Gallery from './Gallery'
import Lightbox from './Lightbox'

const DEFAULT_FILTERS = {
  kinds:    Object.keys(KIND_META),
  stage_id: undefined,
  q:        undefined,
  from:     undefined,
  to:       undefined,
  preset:   'a',
}

export default function Overview({ projectId, stages, refreshKey }) {
  const api = project(projectId)
  const toast = useToast()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [view,    setView]    = useState('timeline')   // 'timeline' | 'gallery'
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)

  const abortRef = useRef(null)

  const params = useMemo(() => {
    const p = { limit: 100 }
    if (filters.kinds && filters.kinds.length < Object.keys(KIND_META).length) {
      p.kinds = filters.kinds.join(',')
    }
    if (filters.stage_id) p.stage_id = filters.stage_id
    if (filters.q)        p.q        = filters.q
    if (filters.from)     p.from     = filters.from
    if (filters.to)       p.to       = filters.to
    return p
  }, [filters])

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.aborted = true
    const my = { aborted: false }
    abortRef.current = my
    setLoading(true)
    try {
      const data = await api.timeline(params)
      if (my.aborted) return
      setEvents(data)
      setHasMore(data.length >= (params.limit || 100))
    } catch {
      if (!my.aborted) toast('Erro ao carregar a linha do tempo', 'error')
    } finally {
      if (!my.aborted) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params), refreshKey])

  useEffect(() => { load() }, [load])

  async function loadOlder() {
    const last = events[events.length - 1]
    if (!last?.occurred_at) return
    try {
      const data = await api.timeline({ ...params, before: last.occurred_at })
      setEvents(prev => [...prev, ...data])
      setHasMore(data.length >= (params.limit || 100))
    } catch {
      toast('Erro ao carregar mais eventos', 'error')
    }
  }

  const photoEvents = useMemo(() => events.filter(e => e.kind === 'photo'), [events])

  return (
    <div className="overview">
      <TimelineFilters filters={filters} onChange={setFilters} stages={stages} />

      <div className="view-toggle-row">
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${view === 'timeline' ? 'active' : ''}`}
            onClick={() => setView('timeline')}
          >
            <LayoutList size={12} /> Linha do tempo
          </button>
          <button
            className={`view-toggle-btn ${view === 'gallery' ? 'active' : ''}`}
            onClick={() => setView('gallery')}
          >
            <ImageIcon size={12} /> Galeria ({photoEvents.length})
          </button>
        </div>
        <div className="view-count">
          {loading ? '…' : `${events.length} evento${events.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {loading && events.length === 0 ? (
        <div className="loading"><div className="spinner" /> Carregando…</div>
      ) : view === 'timeline' ? (
        <TimelineList
          events={events}
          projectId={projectId}
          photoEvents={photoEvents}
          onPhotoClick={(idx) => setLightboxIdx(idx)}
        />
      ) : (
        <Gallery
          photoEvents={photoEvents}
          onPhotoClick={(idx) => setLightboxIdx(idx)}
        />
      )}

      {hasMore && events.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={loadOlder}>
            Carregar mais antigos
          </button>
        </div>
      )}

      {lightboxIdx !== null && photoEvents[lightboxIdx] && (
        <Lightbox
          photoEvents={photoEvents}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  )
}
