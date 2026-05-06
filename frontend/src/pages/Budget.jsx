import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useParams } from 'react-router-dom'
import { project, formatBRL } from '../api/client'

const empty = { planned_amount: '', category_id: '', stage_id: '' }

const statusMeta = {
  ok:        { label: 'OK',        cls: 'badge-green',  icon: CheckCircle,    color: 'var(--green)',  bar: 'var(--green)'  },
  alerta:    { label: 'Alerta',    cls: 'badge-orange', icon: AlertTriangle,  color: 'var(--orange)', bar: 'var(--orange)' },
  estourado: { label: 'Estourado', cls: 'badge-red',    icon: AlertCircle,    color: 'var(--red)',    bar: 'var(--red)'    },
}

function BudgetCard({ budget, onEdit, onDelete }) {
  const meta = statusMeta[budget.status] || statusMeta.ok
  const Icon = meta.icon
  const pct  = Math.min(budget.percent_used, 100)
  const over = budget.percent_used > 100

  const scopeLabel = budget.category
    ? `Categoria · ${budget.category.name}`
    : budget.stage
    ? `Etapa · ${budget.stage.name}`
    : 'Global (todos os gastos)'

  return (
    <div className="budget-card" style={{
      background: 'var(--surface)',
      border: `1px solid ${budget.status !== 'ok' ? meta.color + '44' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color var(--transition)',
    }}>
      {/* glow strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: budget.status !== 'ok' ? meta.color : 'transparent',
        opacity: 0.8,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            {scopeLabel}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.03em', color: 'var(--text)' }}>
            {formatBRL(budget.planned_amount)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            previsto
          </div>
        </div>
        <span className={`badge ${meta.cls}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon size={11} />{meta.label}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            realizado
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: meta.color, fontWeight: 600 }}>
            {budget.percent_used.toFixed(1)}%
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: over
              ? `repeating-linear-gradient(45deg, ${meta.color}, ${meta.color} 4px, ${meta.color}88 4px, ${meta.color}88 8px)`
              : meta.bar,
            borderRadius: 3,
            transition: 'width 600ms ease',
          }} />
        </div>
      </div>

      {/* Numbers row */}
      <div className="budget-nums-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Realizado</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: meta.color }}>{formatBRL(budget.realized_amount)}</div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {budget.remaining_amount >= 0 ? 'Saldo' : 'Excesso'}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
            color: budget.remaining_amount >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {formatBRL(Math.abs(budget.remaining_amount))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon edit" style={{ flex: 1 }} onClick={() => onEdit(budget)}><Pencil size={13} /></button>
        <button className="btn-icon danger" style={{ flex: 1 }} onClick={() => onDelete(budget.id)}><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

export default function Budget() {
  const { id: projectId } = useParams()
  const api = project(projectId)
  const toast = useToast()
  const [budgets,    setBudgets]    = useState([])
  const [categories, setCategories] = useState([])
  const [stages,     setStages]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(empty)
  const [saving,     setSaving]     = useState(false)

  const load = useCallback(async () => {
    const [b, c, s] = await Promise.all([api.budgets.list(), api.categories.list(), api.stages.list()])
    setBudgets(b)
    setCategories(c)
    setStages(s)
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(empty); setEditing(null); setModal(true) }
  const openEdit   = (b)  => {
    setForm({
      planned_amount: b.planned_amount,
      category_id:    b.category_id || '',
      stage_id:       b.stage_id    || '',
    })
    setEditing(b.id)
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.planned_amount || parseFloat(form.planned_amount) <= 0) {
      toast('Valor previsto deve ser maior que zero.', 'error'); return
    }
    const payload = {
      planned_amount: parseFloat(form.planned_amount),
      category_id:    form.category_id ? parseInt(form.category_id) : null,
      stage_id:       form.stage_id    ? parseInt(form.stage_id)    : null,
    }
    setSaving(true)
    try {
      if (editing) {
        await api.budgets.update(editing, { planned_amount: payload.planned_amount })
        toast('Orçamento atualizado!')
      } else {
        await api.budgets.create(payload)
        toast('Orçamento criado!')
      }
      setModal(null)
      load()
    } catch (err) {
      const msg = err.response?.data?.errors?._ ?.[0] || 'Erro ao salvar.'
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remover este orçamento?')) return
    await api.budgets.delete(id)
    toast('Orçamento removido.')
    load()
  }

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const alerts    = budgets.filter(b => b.status !== 'ok')
  const totalPlan = budgets.reduce((s, b) => s + b.planned_amount, 0)
  const totalReal = budgets.filter(b => !b.category_id && !b.stage_id)
                           .reduce((s, b) => s + b.realized_amount, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ORÇAMENTO</h1>
          <p className="page-subtitle">previsto vs realizado · {budgets.length} orçamentos</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Novo orçamento
        </button>
      </div>

      {/* Summary stat strip */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            <TrendingUp size={18} />
          </div>
          <div className="stat-label">Total previsto</div>
          <div className="stat-value" style={{ fontSize: 26 }}>{formatBRL(totalPlan)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>
            <TrendingUp size={18} />
          </div>
          <div className="stat-label">Total realizado (global)</div>
          <div className="stat-value" style={{ fontSize: 26 }}>{formatBRL(totalReal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: alerts.length > 0 ? 'var(--red-dim)' : 'var(--green-dim)', color: alerts.length > 0 ? 'var(--red)' : 'var(--green)' }}>
            <AlertTriangle size={18} />
          </div>
          <div className="stat-label">Orçamentos em alerta</div>
          <div className="stat-value" style={{ fontSize: 26, color: alerts.length > 0 ? 'var(--red)' : 'var(--green)' }}>{alerts.length}</div>
          <div className="stat-sub">{alerts.length === 0 ? 'tudo OK' : 'requer atenção'}</div>
        </div>
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div style={{
          background: 'var(--red-dim)',
          border: '1px solid rgba(244,63,94,.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <AlertTriangle size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--red)' }}>
            {alerts.filter(a => a.status === 'estourado').length > 0
              ? `${alerts.filter(a => a.status === 'estourado').length} orçamento(s) estourado(s) — ação imediata recomendada.`
              : `${alerts.length} orçamento(s) acima de 80% — monitore de perto.`
            }
          </span>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /> Carregando...</div>
      ) : budgets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <TrendingUp size={40} />
            <p>Nenhum orçamento cadastrado.<br />Crie orçamentos para controlar seus gastos.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {budgets.map(b => (
            <BudgetCard key={b.id} budget={b} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={editing ? 'Editar orçamento' : 'Novo orçamento'}
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
            <label className="form-label">Valor previsto (R$) *</label>
            <input className="form-input" type="number" step="0.01" min="0.01" placeholder="0,00"
              value={form.planned_amount} onChange={e => f('planned_amount', e.target.value)} />
          </div>

          {!editing && (
            <>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
                marginBottom: 12, padding: '10px 14px',
                background: 'var(--surface-2)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
              }}>
                Deixe em branco para criar um orçamento <strong style={{ color: 'var(--accent)' }}>global</strong> (abrange todos os gastos).
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Por categoria</label>
                  <select className="form-select" value={form.category_id}
                    onChange={e => { f('category_id', e.target.value); if (e.target.value) f('stage_id', '') }}>
                    <option value="">—</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Por etapa</label>
                  <select className="form-select" value={form.stage_id}
                    onChange={e => { f('stage_id', e.target.value); if (e.target.value) f('category_id', '') }}>
                    <option value="">—</option>
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
