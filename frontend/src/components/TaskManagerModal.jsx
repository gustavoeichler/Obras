import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, CheckCircle2, RotateCcw, ChevronDown, ChevronRight,
  Pencil, Receipt, X, Check,
} from 'lucide-react'
import Modal from './Modal'
import { useToast } from './Toast'
import { project, tasksApi, formatBRL, formatDate } from '../api/client'

const taskTag = (name) => `[${name}]`
const isTaskExpense = (expense, taskName) =>
  (expense.description || '').trim().toLowerCase().startsWith(taskTag(taskName).toLowerCase())

function ExpenseInlineForm({ stageId, taskName, categories, suppliers, onSave, onCancel, saving }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    amount: '', date: today, description: '', category_id: '', supplier_id: '',
  })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = () => {
    const amount = parseFloat(form.amount)
    if (!amount || !form.date) return
    const desc = form.description.trim()
    const tagged = `${taskTag(taskName)}${desc ? ' ' + desc : ''}`
    onSave({
      amount,
      date: form.date,
      description: tagged,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      stage_id:    stageId,
      supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
    })
  }

  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: 12, marginTop: 8,
    }}>
      <div className="form-row" style={{ marginBottom: 8 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Valor (R$) *</label>
          <input className="form-input" type="number" step="0.01" min="0" placeholder="0,00"
            value={form.amount} onChange={e => f('amount', e.target.value)} autoFocus />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Data *</label>
          <input className="form-input" type="date" value={form.date} onChange={e => f('date', e.target.value)} />
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 8 }}>
        <label className="form-label">Descrição</label>
        <input className="form-input" type="text" placeholder="Detalhes do gasto..."
          value={form.description} onChange={e => f('description', e.target.value)} />
      </div>
      <div className="form-row" style={{ marginBottom: 10 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Categoria</label>
          <select className="form-select" value={form.category_id} onChange={e => f('category_id', e.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Fornecedor</label>
          <select className="form-select" value={form.supplier_id} onChange={e => f('supplier_id', e.target.value)}>
            <option value="">Sem fornecedor</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving || !form.amount || !form.date}>
          {saving ? 'Salvando...' : 'Adicionar gasto'}
        </button>
      </div>
    </div>
  )
}

function TaskRow({
  task, expenses, categories, suppliers, stageId,
  onToggleDone, onRename, onDelete, onAddExpense, onDeleteExpense,
}) {
  const [open, setOpen]       = useState(false)
  const [adding, setAdding]   = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(task.name)
  const [saving, setSaving]   = useState(false)

  const taskExpenses = useMemo(
    () => expenses.filter(e => isTaskExpense(e, task.name)),
    [expenses, task.name],
  )
  const total = taskExpenses.reduce((s, e) => s + (e.amount ?? 0), 0)

  const cleanDesc = (full) => {
    const tag = taskTag(task.name)
    return full?.toLowerCase().startsWith(tag.toLowerCase())
      ? full.slice(tag.length).trim() || '—'
      : (full || '—')
  }

  const submitName = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === task.name) { setEditing(false); setName(task.name); return }
    await onRename(task, trimmed)
    setEditing(false)
  }

  const handleAdd = async (payload) => {
    setSaving(true)
    try {
      await onAddExpense(payload)
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
      marginBottom: 10, background: 'var(--surface)',
      borderLeft: `3px solid ${task.is_done ? 'var(--green)' : 'var(--orange)'}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
      }}>
        <button className="btn-icon" onClick={() => setOpen(o => !o)} title={open ? 'Recolher' : 'Expandir'}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {editing ? (
          <input
            className="form-input" type="text" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitName(); if (e.key === 'Escape') { setEditing(false); setName(task.name) } }}
            autoFocus
            style={{ flex: 1 }}
          />
        ) : (
          <span style={{
            flex: 1, fontFamily: 'var(--font-ui)', fontSize: 14,
            color: task.is_done ? 'var(--text-muted)' : 'var(--text)',
            textDecoration: task.is_done ? 'line-through' : 'none',
          }}>
            {task.name}
          </span>
        )}

        <span className={`badge ${task.is_done ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 10 }}>
          {task.is_done ? 'Concluída' : 'Aberta'}
        </span>

        {taskExpenses.length > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
            {formatBRL(total)}
          </span>
        )}

        <div style={{ display: 'flex', gap: 4 }}>
          {editing ? (
            <>
              <button className="btn-icon" style={{ color: 'var(--green)' }} onClick={submitName} title="Salvar">
                <Check size={13} />
              </button>
              <button className="btn-icon" onClick={() => { setEditing(false); setName(task.name) }} title="Cancelar">
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              {task.is_done ? (
                <button className="btn-icon" style={{ color: 'var(--orange)' }} onClick={() => onToggleDone(task)} title="Reabrir tarefa">
                  <RotateCcw size={13} />
                </button>
              ) : (
                <button className="btn-icon" style={{ color: 'var(--green)' }} onClick={() => onToggleDone(task)} title="Concluir tarefa">
                  <CheckCircle2 size={13} />
                </button>
              )}
              <button className="btn-icon edit" onClick={() => setEditing(true)} title="Renomear">
                <Pencil size={13} />
              </button>
              <button className="btn-icon danger" onClick={() => onDelete(task)} title="Remover">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            margin: '10px 0 6px',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <Receipt size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Gastos da tarefa ({taskExpenses.length})
            </span>
            {!adding && (
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
                <Plus size={12} /> Adicionar gasto
              </button>
            )}
          </div>

          {taskExpenses.length === 0 && !adding ? (
            <div style={{
              padding: '12px 0', fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-muted)', textAlign: 'center',
            }}>
              Nenhum gasto nesta tarefa.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Fornecedor</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {taskExpenses.map(e => (
                    <tr key={e.id}>
                      <td className="td-mono" style={{ color: 'var(--text-muted)' }}>{formatDate(e.date)}</td>
                      <td>{cleanDesc(e.description)}</td>
                      <td>
                        {e.category
                          ? <span className="badge badge-dim">{e.category.name}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        {e.supplier
                          ? <span style={{ fontSize: 13 }}>{e.supplier.name}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="td-amount">{formatBRL(e.amount)}</td>
                      <td>
                        <button className="btn-icon danger" onClick={() => onDeleteExpense(e.id)} title="Remover gasto">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adding && (
            <ExpenseInlineForm
              stageId={stageId}
              taskName={task.name}
              categories={categories}
              suppliers={suppliers}
              onSave={handleAdd}
              onCancel={() => setAdding(false)}
              saving={saving}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default function TaskManagerModal({ stage, projectId, onClose }) {
  const toast = useToast()
  const api   = useMemo(() => project(projectId), [projectId])

  const [tasks,      setTasks]      = useState([])
  const [expenses,   setExpenses]   = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers,  setSuppliers]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [newName,    setNewName]    = useState('')
  const [adding,     setAdding]     = useState(false)
  const [filter,     setFilter]     = useState('all')   // all | open | done

  const reload = useCallback(async () => {
    const [t, e] = await Promise.all([
      tasksApi.list(stage.id),
      api.expenses.list({ stage_id: stage.id }),
    ])
    setTasks(Array.isArray(t) ? t : (t?.tasks ?? []))
    setExpenses(e)
  }, [stage.id, api])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      reload(),
      api.categories.list().then(setCategories),
      api.suppliers.list().then(setSuppliers),
    ]).finally(() => setLoading(false))
  }, [reload, api])

  const handleAddTask = async () => {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      await tasksApi.create(stage.id, { name })
      setNewName('')
      await reload()
      toast('Tarefa criada!')
    } catch {
      toast('Erro ao criar tarefa.', 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleToggleDone = async (task) => {
    try {
      await tasksApi.update(task.id, { is_done: !task.is_done })
      reload()
      toast(task.is_done ? 'Tarefa reaberta.' : 'Tarefa concluída!')
    } catch {
      toast('Erro ao atualizar tarefa.', 'error')
    }
  }

  const handleRename = async (task, name) => {
    try {
      await tasksApi.update(task.id, { name })
      reload()
      toast('Tarefa atualizada.')
    } catch {
      toast('Erro ao renomear.', 'error')
    }
  }

  const handleDeleteTask = async (task) => {
    if (!confirm(`Remover a tarefa "${task.name}"?`)) return
    try {
      await tasksApi.delete(task.id)
      reload()
      toast('Tarefa removida.')
    } catch {
      toast('Erro ao remover tarefa.', 'error')
    }
  }

  const handleAddExpense = async (payload) => {
    try {
      await api.expenses.create(payload)
      await reload()
      toast('Gasto adicionado!')
    } catch (err) {
      const msg = err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : 'Erro ao salvar gasto.'
      toast(msg, 'error')
      throw err
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!confirm('Remover este gasto?')) return
    try {
      await api.expenses.delete(id)
      reload()
      toast('Gasto removido.')
    } catch {
      toast('Erro ao remover gasto.', 'error')
    }
  }

  const total       = tasks.length
  const done        = tasks.filter(t => t.is_done).length
  const open        = total - done
  const progressPct = total ? Math.round((done / total) * 100) : 0
  const totalSpent  = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)

  const visible = tasks.filter(t =>
    filter === 'all' ? true : filter === 'done' ? t.is_done : !t.is_done,
  )

  return (
    <Modal title={`Tarefas · ${stage.name}`} onClose={onClose}>
      {/* Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
        marginBottom: 14,
      }}>
        {[
          { label: 'Total',      value: total,                   color: 'var(--text)' },
          { label: 'Abertas',    value: open,                    color: 'var(--orange)' },
          { label: 'Concluídas', value: done,                    color: 'var(--green)' },
          { label: 'Gastos',     value: formatBRL(totalSpent),   color: 'var(--accent)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '8px 10px',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
            }}>
              {s.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 16, color: s.color,
              lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            Progresso
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
            {progressPct}%
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progressPct}%`,
            background: progressPct >= 100 ? 'var(--green)' : 'var(--accent)',
            borderRadius: 3, transition: 'width 400ms ease',
          }} />
        </div>
      </div>

      {/* Filter tabs */}
      {total > 0 && (
        <div className="view-toggle" style={{ marginBottom: 12 }}>
          {[
            { key: 'all',  label: `Todas (${total})` },
            { key: 'open', label: `Abertas (${open})` },
            { key: 'done', label: `Concluídas (${done})` },
          ].map(t => (
            <button
              key={t.key}
              className={`view-toggle-btn${filter === t.key ? ' active' : ''}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Task list */}
      <div style={{ maxHeight: 420, overflowY: 'auto', marginBottom: 12 }}>
        {loading ? (
          <div className="loading"><div className="spinner" /> Carregando...</div>
        ) : visible.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px 0',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)',
          }}>
            {total === 0 ? 'Nenhuma tarefa. Adicione abaixo.' : 'Nenhuma tarefa neste filtro.'}
          </div>
        ) : visible.map(t => (
          <TaskRow
            key={t.id}
            task={t}
            expenses={expenses}
            categories={categories}
            suppliers={suppliers}
            stageId={stage.id}
            onToggleDone={handleToggleDone}
            onRename={handleRename}
            onDelete={handleDeleteTask}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        ))}
      </div>

      {/* New task input */}
      <div style={{
        display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)',
      }}>
        <input
          className="form-input" type="text" placeholder="Nova tarefa..."
          value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddTask() }}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-sm" onClick={handleAddTask} disabled={adding || !newName.trim()}>
          <Plus size={13} /> Adicionar
        </button>
      </div>
    </Modal>
  )
}
