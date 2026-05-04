import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'

export default function Lightbox({ photoEvents, index: initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const touchStart = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft')  setIndex(i => Math.max(0, i - 1))
      else if (e.key === 'ArrowRight') setIndex(i => Math.min(photoEvents.length - 1, i + 1))
      else if (e.key.toLowerCase() === 'd') triggerDownload()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoEvents.length])

  if (!photoEvents.length) return null
  const ev = photoEvents[index]
  if (!ev) return null
  const p = ev.payload

  function triggerDownload() {
    const a = document.createElement('a')
    a.href = p.url
    a.download = p.description || `photo-${p.photo_id}.jpg`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX
  }
  function onTouchEnd(e) {
    if (touchStart.current == null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    if (Math.abs(dx) > 60) {
      if (dx < 0) setIndex(i => Math.min(photoEvents.length - 1, i + 1))
      else        setIndex(i => Math.max(0, i - 1))
    }
    touchStart.current = null
  }

  return (
    <div
      className="lightbox-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button className="lightbox-close" onClick={onClose} aria-label="Fechar">
        <X size={20} />
      </button>

      <button
        className="lightbox-nav prev"
        onClick={() => setIndex(i => Math.max(0, i - 1))}
        disabled={index === 0}
        aria-label="Anterior"
      >
        <ChevronLeft size={28} />
      </button>

      <div className="lightbox-stage">
        <img src={p.url} alt={p.description || ''} className="lightbox-image" />
        <div className="lightbox-meta">
          {p.description && <div className="lightbox-desc">{p.description}</div>}
          <div className="lightbox-sub">
            {ev.occurred_at && <span>{new Date(ev.occurred_at).toLocaleString('pt-BR')}</span>}
            {ev.stage && <span>· {ev.stage.name}</span>}
            {p.uploaded_by_email && <span>· {p.uploaded_by_email}</span>}
            <span>· {index + 1} / {photoEvents.length}</span>
          </div>
        </div>
      </div>

      <button
        className="lightbox-nav next"
        onClick={() => setIndex(i => Math.min(photoEvents.length - 1, i + 1))}
        disabled={index === photoEvents.length - 1}
        aria-label="Próxima"
      >
        <ChevronRight size={28} />
      </button>

      <button className="lightbox-download" onClick={triggerDownload} title="Baixar (D)">
        <Download size={16} /> Baixar
      </button>
    </div>
  )
}
