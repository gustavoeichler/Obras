import { useNavigate } from 'react-router-dom'
import {
  Camera, ClipboardList, DollarSign, FileText, AlertTriangle,
  Flag, Download, ExternalLink, Cloud, Users,
} from 'lucide-react'
import { formatBRL } from '../../api/client'
import { KIND_META } from './TimelineFilters'
import { OCCURRENCE_LABELS } from '../OccurrenceModal'

const ICONS = {
  photo:           Camera,
  rdo:             ClipboardList,
  expense:         DollarSign,
  document:        FileText,
  occurrence:      AlertTriangle,
  stage_milestone: Flag,
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export default function TimelineEventCard({ event, projectId, onPhotoClick }) {
  const Icon = ICONS[event.kind] || FileText
  const color = KIND_META[event.kind]?.color || '#999'
  const navigate = useNavigate()

  return (
    <div className={`timeline-card kind-${event.kind}`} style={{ borderLeftColor: color }}>
      <div className="timeline-card-h">
        <span className="timeline-card-icon" style={{ color }}>
          <Icon size={13} />
        </span>
        <span className="timeline-card-time">{formatTime(event.occurred_at)}</span>
        {event.stage && <span className="timeline-card-stage">{event.stage.name}</span>}
      </div>

      {event.kind === 'photo' && (
        <Photo event={event} onClick={onPhotoClick} />
      )}

      {event.kind === 'rdo' && (
        <Rdo event={event} projectId={projectId} navigate={navigate} />
      )}

      {event.kind === 'expense' && (
        <Expense event={event} />
      )}

      {event.kind === 'document' && (
        <Document event={event} />
      )}

      {event.kind === 'occurrence' && (
        <Occurrence event={event} />
      )}

      {event.kind === 'stage_milestone' && (
        <Milestone event={event} />
      )}
    </div>
  )
}

function Photo({ event, onClick }) {
  const p = event.payload
  return (
    <button className="ev-photo" onClick={onClick} type="button">
      <img src={p.url} alt={p.description || ''} loading="lazy" />
      <div className="ev-photo-body">
        {p.description && <div className="ev-title">{p.description}</div>}
        {p.uploaded_by_email && (
          <div className="ev-sub">por {p.uploaded_by_email}</div>
        )}
      </div>
    </button>
  )
}

function Rdo({ event, projectId, navigate }) {
  const p = event.payload
  return (
    <div className="ev-body">
      <div className="ev-title">{event.title}</div>
      <div className="ev-meta">
        {p.weather && <span><Cloud size={11} /> {p.weather}{p.weather_temp_c != null ? ` ${Math.round(p.weather_temp_c)}°C` : ''}</span>}
        {p.headcount?.length > 0 && (
          <span><Users size={11} /> {p.headcount.reduce((s, h) => s + (h.count || 0), 0)}</span>
        )}
        {p.photo_count > 0 && <span><Camera size={11} /> {p.photo_count}</span>}
        {p.occurrence_count > 0 && <span className="ev-warn"><AlertTriangle size={11} /> {p.occurrence_count}</span>}
      </div>
      {event.body && <div className="ev-text">{event.body}</div>}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate(`/projects/${projectId}/daily-reports/${p.rdo_id}`)}
      >
        Abrir RDO <ExternalLink size={11} />
      </button>
    </div>
  )
}

function Expense({ event }) {
  const p = event.payload
  return (
    <div className="ev-body">
      <div className="ev-title">{p.description || 'Despesa'}</div>
      <div className="ev-meta">
        <span className="ev-amount">{formatBRL(p.amount)}</span>
        {p.supplier_name && <span>{p.supplier_name}</span>}
        {p.category_name && <span className="badge badge-dim">{p.category_name}</span>}
        {p.quantity && p.unit && <span>{p.quantity} {p.unit}</span>}
      </div>
    </div>
  )
}

function Document({ event }) {
  const p = event.payload
  return (
    <div className="ev-body">
      <div className="ev-title">{p.name}</div>
      <div className="ev-meta">
        {p.mime_type && <span>{p.mime_type}</span>}
        {p.size && <span>{formatBytes(p.size)}</span>}
        {p.original_filename && <span>{p.original_filename}</span>}
      </div>
      <div className="ev-actions">
        <a className="btn btn-ghost btn-sm" href={p.inline_url} target="_blank" rel="noreferrer">
          <ExternalLink size={11} /> Abrir
        </a>
        <a className="btn btn-ghost btn-sm" href={p.download_url}>
          <Download size={11} /> Baixar
        </a>
      </div>
    </div>
  )
}

function Occurrence({ event }) {
  const p = event.payload
  const label = OCCURRENCE_LABELS[p.kind] || p.kind
  return (
    <div className="ev-body">
      <div className="ev-meta">
        <span className={`rdo-occ-kind kind-${p.kind}`}>{label}</span>
        {p.rdo_date && <span>RDO {new Date(p.rdo_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
      </div>
      <div className="ev-text">{event.title}{event.body ? `…${event.body.slice(event.title.length)}` : ''}</div>
    </div>
  )
}

function Milestone({ event }) {
  return (
    <div className="ev-body">
      <div className="ev-title">{event.title}</div>
    </div>
  )
}
