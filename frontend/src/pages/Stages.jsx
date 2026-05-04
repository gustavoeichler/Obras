import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Calendar,
  AlertTriangle, List, BarChart2, Layers, TrendingUp,
  CheckCircle, Clock,
} from 'lucide-react'
import Modal from '../components/Modal'
import TaskManagerModal from '../components/TaskManagerModal'
import { useToast } from '../components/Toast'
import { useParams } from 'react-router-dom'
import { project, formatBRL, formatDate, STAGE_STATUSES, STAGE_STATUS_LABEL } from '../api/client'

const empty = {
  name: '', status: 'nao_iniciada',
  planned_start_date: '', planned_end_date: '',
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  concluida:    { badge: 'badge-green',  color: 'var(--green)',    bg: 'var(--green-dim)'  },
  em_andamento: { badge: 'badge-orange', color: 'var(--orange)',   bg: 'var(--orange-dim)' },
  nao_iniciada: { badge: 'badge-dim',    color: 'var(--text-dim)', bg: 'transparent'       },
}
const getCfg = (status, isDelayed) =>
  isDelayed
    ? { badge: 'badge-red', color: 'var(--red)', bg: 'var(--red-dim)' }
    : (STATUS_CFG[status] || STATUS_CFG.nao_iniciada)
const statusLabel = (status) => STAGE_STATUS_LABEL[status] || status

// ── Circular progress ring ────────────────────────────────────────────────────
function Ring({ pct, size = 56, stroke = 5, color, dashed = false }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const off  = circ * (1 - Math.min(pct, 100) / 100)
  if (dashed) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ flexShrink: 0, display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--text-muted)" strokeWidth={stroke}
          strokeDasharray="3 4" opacity={0.45} />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)', flexShrink: 0, display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--surface-3)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${circ}`} strokeDashoffset={`${off}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  )
}

// ── Stats strip ───────────────────────────────────────────────────────────────
function StatsStrip({ stages }) {
  const total   = stages.length
  const done    = stages.filter(s => s.status === 'concluida').length
  const active  = stages.filter(s => s.status === 'em_andamento').length
  const delayed = stages.filter(s => s.is_delayed).length
  const globalPct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="stats-strip">
      {[
        { label: 'Total',        value: total,   color: 'var(--text)',                              icon: <Layers size={14} /> },
        { label: 'Concluídas',   value: done,    color: 'var(--green)',                             icon: <CheckCircle size={14} /> },
        { label: 'Em andamento', value: active,  color: 'var(--orange)',                            icon: <Clock size={14} /> },
        { label: 'Atrasadas',    value: delayed, color: delayed > 0 ? 'var(--red)' : 'var(--text-muted)', icon: <AlertTriangle size={14} /> },
      ].map(s => (
        <div key={s.label} className="stat-box">
          <div className="stat-icon" style={{ color: s.color }}>{s.icon}</div>
          <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
      <div className="stat-box stat-progress-box">
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-muted)', marginBottom: 8,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Progresso global
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${globalPct}%`,
              background: globalPct === 100 ? 'var(--green)' : 'var(--accent)',
              borderRadius: 3, transition: 'width 800ms ease',
            }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: globalPct === 100 ? 'var(--green)' : 'var(--accent)', lineHeight: 1 }}>
            {globalPct}%
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Pipeline view ─────────────────────────────────────────────────────────────
function PipelineView({ stages, onEdit, onDelete, onTasks }) {
  return (
    <div className="pipeline-wrap">
      <div className="pipeline-connector" />
      {stages.map((s, i) => {
        const cfg      = getCfg(s.status, s.is_delayed)
        const hasTasks = s.total_tasks > 0
        const pct      = hasTasks ? s.progress : 0
        const label    = s.is_delayed ? 'Atrasada' : statusLabel(s.status)

        return (
          <div key={s.id} className="pipeline-row" style={{ animationDelay: `${i * 65}ms` }}>
            {/* Numbered / status node */}
            <div className="pipeline-node" style={{ borderColor: cfg.color, background: cfg.bg, color: cfg.color }}>
              {s.status === 'concluida' && !s.is_delayed
                ? <CheckCircle size={16} />
                : <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{i + 1}</span>
              }
            </div>

            {/* Card */}
            <div className="pipeline-card" style={{ borderColor: s.is_delayed ? 'rgba(244,63,94,.28)' : undefined }}>
              <div className="pipeline-card-accent" style={{ background: cfg.color }} />

              {/* Ring */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Ring pct={pct} size={54} stroke={4} color={cfg.color} dashed={!hasTasks} />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 12,
                  color: hasTasks ? cfg.color : 'var(--text-muted)',
                }}>
                  {hasTasks ? `${pct}%` : '—'}
                </div>
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 19,
                  letterSpacing: '0.03em', lineHeight: 1.15,
                  color: s.is_delayed ? 'var(--red)' : 'var(--text)',
                  marginBottom: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.is_delayed && (
                    <AlertTriangle size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--red)' }} />
                  )}
                  {s.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${cfg.badge}`} style={{ fontSize: 10 }}>{label}</span>
                  {hasTasks ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                      {s.done_tasks}/{s.total_tasks} tarefas
                    </span>
                  ) : (
                    <button
                      onClick={() => onTasks(s)}
                      className="badge"
                      style={{
                        fontSize: 10, cursor: 'pointer',
                        background: 'rgba(245,158,11,.1)',
                        color: 'var(--orange, #f59e0b)',
                        border: '1px solid rgba(245,158,11,.3)',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}
                      title="Abrir gerenciador de tarefas"
                    >
                      <AlertTriangle size={10} /> Sem tarefas — clique para adicionar
                    </button>
                  )}
                  {(s.planned_start_date || s.start_date) && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: s.is_delayed ? 'var(--red)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Calendar size={9} />
                      {formatDate(s.planned_start_date || s.start_date)} → {formatDate(s.planned_end_date || s.end_date)}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 10, height: 3, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: hasTasks ? cfg.color : 'transparent',
                    borderRadius: 2, transition: 'width 800ms ease',
                  }} />
                </div>
              </div>

              {/* Right: expenses + actions */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                  {formatBRL(s.total_expenses ?? 0)}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-icon" style={{ color: 'var(--accent)' }} onClick={() => onTasks(s)} title="Checklist">
                    <List size={13} />
                  </button>
                  <button className="btn-icon edit" onClick={() => onEdit(s)} title="Editar">
                    <Pencil size={13} />
                  </button>
                  <button className="btn-icon danger" onClick={() => onDelete(s.id)} title="Remover">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Cards view ────────────────────────────────────────────────────────────────
function CardsView({ stages, onEdit, onDelete, onTasks }) {
  return (
    <div className="stage-grid">
      {stages.map((s, i) => {
        const cfg      = getCfg(s.status, s.is_delayed)
        const hasTasks = s.total_tasks > 0
        const pct      = hasTasks ? s.progress : 0
        const label    = s.is_delayed ? 'Atrasada' : statusLabel(s.status)

        return (
          <div key={s.id} className="stage-card"
            style={{
              borderColor: s.is_delayed ? 'rgba(244,63,94,.3)' : undefined,
              animationDelay: `${i * 60}ms`,
            }}>
            {/* Top accent */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: cfg.color, borderRadius: '12px 12px 0 0' }} />

            <div className="stage-card-top">
              <div className="stage-name" style={{ color: s.is_delayed ? 'var(--red)' : undefined }}>
                {s.is_delayed && <AlertTriangle size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
                {s.name}
              </div>
              <span className={`badge ${cfg.badge}`} style={{ fontSize: 10 }}>{label}</span>
            </div>

            {/* Ring centered */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0', position: 'relative' }}>
              <Ring pct={pct} size={72} stroke={6} color={cfg.color} dashed={!hasTasks} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 18,
                color: hasTasks ? cfg.color : 'var(--text-muted)',
              }}>
                {hasTasks ? `${pct}%` : '—'}
              </div>
            </div>

            {hasTasks ? (
              <div style={{
                textAlign: 'center', fontFamily: 'var(--font-mono)',
                fontSize: 10, color: 'var(--text-muted)', marginBottom: 8,
              }}>
                {s.done_tasks}/{s.total_tasks} tarefas
              </div>
            ) : (
              <button
                onClick={() => onTasks(s)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  width: '100%', marginBottom: 8, padding: '6px 8px',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--orange, #f59e0b)',
                  background: 'rgba(245,158,11,.08)',
                  border: '1px solid rgba(245,158,11,.3)',
                  borderRadius: 6, cursor: 'pointer',
                }}
                title="Abrir gerenciador de tarefas"
              >
                <AlertTriangle size={11} /> Sem tarefas — clique para adicionar
              </button>
            )}

            <div className="stage-total">{formatBRL(s.total_expenses ?? 0)}</div>

            {(s.planned_start_date || s.planned_end_date) && (
              <div className="stage-dates" style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', color: s.is_delayed ? 'var(--red)' : undefined }}>
                  <Calendar size={9} />
                  <span>Plan: {s.planned_start_date ? formatDate(s.planned_start_date) : '?'} → {s.planned_end_date ? formatDate(s.planned_end_date) : '?'}</span>
                </div>
              </div>
            )}

            <div className="stage-actions">
              <button className="btn-icon" style={{ flex: 1, color: 'var(--accent)' }} onClick={() => onTasks(s)} title="Checklist">
                <List size={13} />
              </button>
              <button className="btn-icon edit" style={{ flex: 1 }} onClick={() => onEdit(s)}><Pencil size={13} /></button>
              <button className="btn-icon danger" style={{ flex: 1 }} onClick={() => onDelete(s.id)}><Trash2 size={13} /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Gantt chart ───────────────────────────────────────────────────────────────
function GanttChart({ stages }) {
  const withDates = stages.filter(s => s.planned_start_date || s.planned_end_date)
  if (withDates.length === 0) return (
    <div className="card">
      <div className="empty-state">
        <p>Nenhuma etapa com datas cadastradas para exibir no cronograma.</p>
      </div>
    </div>
  )

  const allDates = withDates.flatMap(s => [
    s.planned_start_date, s.planned_end_date,
  ]).filter(Boolean).map(d => new Date(d))

  const minDate = new Date(Math.min(...allDates))
  const maxDate = new Date(Math.max(...allDates))
  const totalMs = maxDate - minDate || 1
  const today   = new Date()

  const pct = (d) => ((new Date(d) - minDate) / totalMs) * 100
  const wid = (s, e) => {
    const start = new Date(s || e)
    const end   = new Date(e || s)
    return Math.max(((end - start) / totalMs) * 100, 1)
  }
  const todayPct = ((today - minDate) / totalMs) * 100

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Cronograma (Gantt)</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          {minDate.toLocaleDateString('pt-BR')} → {maxDate.toLocaleDateString('pt-BR')}
        </span>
      </div>
      <div style={{ padding: '20px 24px', overflowX: 'auto' }}>
        {withDates.map(s => {
          const cfg    = getCfg(s.status, s.is_delayed)
          const hasPlan = s.planned_start_date && s.planned_end_date

          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 130, flexShrink: 0,
                fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
                color: s.is_delayed ? 'var(--red)' : 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {s.is_delayed && <AlertTriangle size={11} style={{ color: 'var(--red)', marginRight: 4, verticalAlign: 'middle' }} />}
                {s.name}
              </div>

              <div style={{ flex: 1, position: 'relative', height: 28, minWidth: 300 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'var(--surface-2)', borderRadius: 4 }} />
                {todayPct >= 0 && todayPct <= 100 && (
                  <div style={{
                    position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
                    width: 1, background: 'var(--accent)', opacity: 0.7, zIndex: 5,
                  }} />
                )}
                {hasPlan && (
                  <div style={{
                    position: 'absolute',
                    left: `${pct(s.planned_start_date)}%`,
                    width: `${wid(s.planned_start_date, s.planned_end_date)}%`,
                    top: 8, height: 12,
                    background: cfg.color,
                    borderRadius: 2, opacity: 0.85, zIndex: 1,
                  }} title={`Planejado: ${formatDate(s.planned_start_date)} → ${formatDate(s.planned_end_date)}`} />
                )}
              </div>
              <span className={`badge ${cfg.badge}`} style={{ flexShrink: 0, fontSize: 10 }}>{s.is_delayed ? 'atrasada' : statusLabel(s.status)}</span>
            </div>
          )
        })}

        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 4, background: 'var(--accent)', display: 'inline-block', borderRadius: 2 }} /> Planejado
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 1, height: 14, background: 'var(--accent)', display: 'inline-block' }} /> Hoje
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Stages() {
  const { id: projectId } = useParams()
  const api = project(projectId)
  const toast = useToast()
  const [stages,    setStages]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)   // 'form' | 'tasks'
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(empty)
  const [saving,    setSaving]    = useState(false)
  const [taskStage, setTaskStage] = useState(null)
  const [view,      setView]      = useState('pipeline')   // 'pipeline' | 'cards' | 'gantt'

  const load = useCallback(() =>
    api.stages.list().then(setStages).finally(() => setLoading(false)),
  [projectId])
  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(empty); setEditing(null); setModal('form') }
  const openEdit   = (s) => {
    setForm({
      name:               s.name,
      status:             s.status,
      planned_start_date: s.planned_start_date || '',
      planned_end_date:   s.planned_end_date   || '',
    })
    setEditing(s.id)
    setModal('form')
  }
  const openTasks = (s) => { setTaskStage(s); setModal('tasks') }

  const handleSave = async () => {
    if (!form.name.trim()) { toast('Nome é obrigatório.', 'error'); return }
    const payload = {
      name:               form.name.trim(),
      status:             form.status,
      planned_start_date: form.planned_start_date || null,
      planned_end_date:   form.planned_end_date   || null,
    }
    setSaving(true)
    try {
      if (editing) {
        await api.stages.update(editing, payload)
        toast('Etapa atualizada!')
      } else {
        await api.stages.create(payload)
        toast('Etapa criada!')
      }
      setModal(null)
      load()
    } catch {
      toast('Erro ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remover esta etapa? Os gastos vinculados perderão a etapa.')) return
    await api.stages.delete(id)
    toast('Etapa removida.')
    load()
  }

  const f       = (key, val) => setForm(p => ({ ...p, [key]: val }))
  const delayed = stages.filter(s => s.is_delayed)

  const VIEWS = [
    { key: 'pipeline', icon: <Layers size={13} />,     label: 'Pipeline'    },
    { key: 'cards',    icon: <TrendingUp size={13} />, label: 'Cards'       },
    { key: 'gantt',    icon: <BarChart2 size={13} />,  label: 'Cronograma'  },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">ETAPAS</h1>
          <p className="page-subtitle">
            {stages.length} etapa{stages.length !== 1 ? 's' : ''} cadastrada{stages.length !== 1 ? 's' : ''}
            {delayed.length > 0 && (
              <span style={{ color: 'var(--red)', marginLeft: 8 }}>
                · {delayed.length} atrasada{delayed.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="view-toggle">
            {VIEWS.map(v => (
              <button
                key={v.key}
                className={`view-toggle-btn${view === v.key ? ' active' : ''}`}
                onClick={() => setView(v.key)}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} /> Nova etapa
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {!loading && stages.length > 0 && <StatsStrip stages={stages} />}

      {/* Delayed alert */}
      {delayed.length > 0 && (
        <div style={{
          background: 'rgba(244,63,94,.07)', border: '1px solid rgba(244,63,94,.25)',
          borderRadius: 'var(--radius-lg)', padding: '11px 18px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)' }}>
            Prazo ultrapassado: {delayed.map(s => s.name).join(', ')}
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading"><div className="spinner" /> Carregando...</div>
      ) : stages.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Layers size={40} style={{ opacity: 0.25, marginBottom: 12 }} />
            <p>Nenhuma etapa cadastrada.</p>
            <p style={{ marginTop: 6, fontSize: 11 }}>Clique em "Nova etapa" para começar.</p>
          </div>
        </div>
      ) : view === 'pipeline' ? (
        <PipelineView stages={stages} onEdit={openEdit} onDelete={handleDelete} onTasks={openTasks} />
      ) : view === 'cards' ? (
        <CardsView stages={stages} onEdit={openEdit} onDelete={handleDelete} onTasks={openTasks} />
      ) : (
        <GanttChart stages={stages} />
      )}

      {/* Stage form modal */}
      {modal === 'form' && (
        <Modal
          title={editing ? 'Editar etapa' : 'Nova etapa'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="form-input" type="text" placeholder="Ex: Fundação"
              value={form.name} onChange={e => f('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => f('status', e.target.value)}>
              {STAGE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            margin: '16px 0 10px', paddingTop: 14, borderTop: '1px solid var(--border)',
          }}>
            Datas planejadas
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Início planejado</label>
              <input className="form-input" type="date" value={form.planned_start_date} onChange={e => f('planned_start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Término planejado</label>
              <input className="form-input" type="date" value={form.planned_end_date} onChange={e => f('planned_end_date', e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* Task manager modal */}
      {modal === 'tasks' && taskStage && (
        <TaskManagerModal
          stage={taskStage}
          projectId={projectId}
          onClose={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
