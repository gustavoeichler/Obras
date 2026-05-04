import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { project, formatBRL, formatDate } from '../api/client'
import BenchmarkChip from '../components/BenchmarkChip'

const empty = { amount: '', date: '', description: '', category_id: '', stage_id: '', supplier_id: '', quantity: '', unit: '' }
const UNITS = ['un', 'kg', 'saco_50kg', 'm', 'm2', 'm3', 'h', 'dia', 'L']

export default function Expenses() {
  const { id: projectId } = useParams()
  const api = project(projectId)
  const toast = useToast()
  const [expenses,   setExpenses]   = useState([])
  const [categories, setCategories] = useState([])
  const [stages,     setStages]     = useState([])
  const [suppliers,  setSuppliers]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)   // null | 'create' | 'edit'
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(empty)
  const [saving,     setSaving]     = useState(false)
  const [filters,    setFilters]    = useState({ category_id: '', stage_id: '', supplier_id: '' })

  const load = useCallback(async () => {
    const params = {}
    if (filters.category_id) params.category_id = filters.category_id
    if (filters.stage_id)    params.stage_id    = filters.stage_id
    if (filters.supplier_id) params.supplier_id = filters.supplier_id
    const data = await api.expenses.list(params)
    setExpenses(data)
  }, [filters, projectId])

  useEffect(() => {
    setLoading(true)
    Promise.all([load(), api.categories.list(), api.stages.list(), api.suppliers.list()])
      .then(([, cats, sts, sups]) => {
        setCategories(cats)
        setStages(sts)
        setSuppliers(sups)
      })
      .finally(() => setLoading(false))
  }, [load])

  const openCreate = () => { setForm(empty); setEditing(null); setModal('create') }
  const openEdit   = (e)  => {
    setForm({
      amount:      e.amount,
      date:        e.date,
      description: e.description || '',
      category_id: e.category_id || '',
      stage_id:    e.stage_id    || '',
      supplier_id: e.supplier_id || '',
      quantity:    e.quantity ?? '',
      unit:        e.unit || '',
    })
    setEditing(e.id)
    setModal('edit')
  }

  const handleSave = async () => {
    const payload = {
      amount:      parseFloat(form.amount),
      date:        form.date,
      description: form.description || null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      stage_id:    form.stage_id    ? parseInt(form.stage_id)    : null,
      supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
      quantity:    form.quantity !== '' ? parseFloat(form.quantity) : null,
      unit:        form.unit || null,
    }
    if (!payload.amount || !payload.date) { toast('Preencha valor e data.', 'error'); return }
    setSaving(true)
    try {
      if (modal === 'edit') {
        await api.expenses.update(editing, payload)
        toast('Gasto atualizado!')
      } else {
        await api.expenses.create(payload)
        toast('Gasto criado!')
      }
      setModal(null)
      load()
    } catch (err) {
      toast(err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : 'Erro ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remover este gasto?')) return
    await api.expenses.delete(id)
    toast('Gasto removido.')
    load()
  }

  const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">GASTOS</h1>
          <p className="page-subtitle">{expenses.length} registros · total: {formatBRL(total)}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Novo gasto
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="form-select" value={filters.category_id} onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}>
          <option value="">Todas categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-select" value={filters.stage_id} onChange={e => setFilters(p => ({ ...p, stage_id: e.target.value }))}>
          <option value="">Todas etapas</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="form-select" value={filters.supplier_id} onChange={e => setFilters(p => ({ ...p, supplier_id: e.target.value }))}>
          <option value="">Todos fornecedores</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {(filters.category_id || filters.stage_id || filters.supplier_id) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ category_id: '', stage_id: '', supplier_id: '' })}>
            Limpar filtros
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" /> Carregando...</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum gasto encontrado.<br />Clique em "Novo gasto" para começar.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Etapa</th>
                  <th>Fornecedor</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td className="td-mono" style={{ color: 'var(--text-muted)' }}>{formatDate(e.date)}</td>
                    <td>{e.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>
                      {e.category
                        ? <span className="badge badge-dim">{e.category.name}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      {e.stage
                        ? <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{e.stage.name}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      {e.supplier
                        ? <span style={{ fontSize: 13 }}>{e.supplier.name}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="td-amount">
                      {formatBRL(e.amount)}
                      {e.quantity && e.unit && (
                        <div style={{ marginTop: 4 }}>
                          <BenchmarkChip projectApi={api} expenseId={e.id} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-icon edit" onClick={() => openEdit(e)}><Pencil size={14} /></button>
                        <button className="btn-icon danger" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'edit' ? 'Editar gasto' : 'Novo gasto'}
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
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Valor (R$) *</label>
              <input className="form-input" type="number" step="0.01" min="0" placeholder="0,00"
                value={form.amount} onChange={e => f('amount', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data *</label>
              <input className="form-input" type="date" value={form.date} onChange={e => f('date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="form-input" type="text" placeholder="Ex: Compra de cimento"
              value={form.description} onChange={e => f('description', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.category_id} onChange={e => f('category_id', e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Etapa</label>
              <select className="form-select" value={form.stage_id} onChange={e => f('stage_id', e.target.value)}>
                <option value="">Sem etapa</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Fornecedor</label>
            <select className="form-select" value={form.supplier_id} onChange={e => f('supplier_id', e.target.value)}>
              <option value="">Sem fornecedor</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantidade (opcional)</label>
              <input className="form-input" type="number" step="0.01" min="0"
                placeholder="ex: 10"
                value={form.quantity} onChange={e => f('quantity', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Unidade</label>
              <select className="form-select" value={form.unit} onChange={e => f('unit', e.target.value)}>
                <option value="">—</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Informe quantidade e unidade para comparar seu preço com a média de mercado.
          </div>
        </Modal>
      )}
    </div>
  )
}
