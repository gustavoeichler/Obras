import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'

export const KIND_META = {
  photo:           { label: 'Fotos',       color: '#f0b429' },
  rdo:             { label: 'RDOs',        color: '#5ec6ff' },
  expense:         { label: 'Despesas',    color: '#3aaf6c' },
  document:        { label: 'Documentos',  color: '#b46cff' },
  occurrence:      { label: 'Ocorrências', color: '#f08585' },
  stage_milestone: { label: 'Etapas',      color: '#bbb'    },
  task:            { label: 'Tarefas',     color: '#fd9644' },
}

const PRESETS = [
  { key: '7',  label: '7d'        },
  { key: '30', label: '30d'       },
  { key: 'm',  label: 'Este mês'  },
  { key: 'a',  label: 'Tudo'      },
]

function todayIso(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function startOfMonthIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export default function TimelineFilters({ filters, onChange, stages = [] }) {
  const [qDraft, setQDraft] = useState(filters.q || '')

  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.q || '') !== qDraft) onChange({ ...filters, q: qDraft || undefined })
    }, 250)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft])

  function toggleKind(k) {
    const set = new Set(filters.kinds || Object.keys(KIND_META))
    if (set.has(k)) set.delete(k); else set.add(k)
    if (set.size === 0) return // require at least one
    onChange({ ...filters, kinds: [...set] })
  }

  function applyPreset(key) {
    if (key === 'a') return onChange({ ...filters, from: undefined, to: undefined, preset: 'a' })
    if (key === 'm') return onChange({ ...filters, from: startOfMonthIso(), to: todayIso(), preset: 'm' })
    return onChange({ ...filters, from: todayIso(-Number(key)), to: todayIso(), preset: key })
  }

  const activeKinds = new Set(filters.kinds || Object.keys(KIND_META))

  return (
    <div className="timeline-filters">
      <div className="kind-chips">
        {Object.entries(KIND_META).map(([k, meta]) => (
          <button
            key={k}
            className={`kind-chip ${activeKinds.has(k) ? 'active' : ''}`}
            style={activeKinds.has(k) ? { '--chip-color': meta.color } : undefined}
            onClick={() => toggleKind(k)}
            type="button"
          >
            <span className="kind-chip-dot" style={{ background: meta.color }} />
            {meta.label}
          </button>
        ))}
      </div>

      <div className="filters-row">
        <select
          className="form-select"
          value={filters.stage_id || ''}
          onChange={e => onChange({ ...filters, stage_id: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Todas as etapas</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div className="preset-chips">
          {PRESETS.map(p => (
            <button
              key={p.key}
              type="button"
              className={`preset-chip ${filters.preset === p.key ? 'active' : ''}`}
              onClick={() => applyPreset(p.key)}
            >{p.label}</button>
          ))}
        </div>

        <div className="search-input">
          <Search size={12} />
          <input
            placeholder="Buscar…"
            value={qDraft}
            onChange={e => setQDraft(e.target.value)}
          />
          {qDraft && (
            <button className="btn-icon" onClick={() => setQDraft('')}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
