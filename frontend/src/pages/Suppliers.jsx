import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Phone } from 'lucide-react'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useParams } from 'react-router-dom'
import { project } from '../api/client'

const empty = { name: '', type: '', contact: '' }

export default function Suppliers() {
  const { id: projectId } = useParams()
  const api = project(projectId)
  const toast = useToast()
  const [suppliers, setSuppliers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(empty)
  const [saving,    setSaving]    = useState(false)

  const load = useCallback(() =>
    api.suppliers.list().then(setSuppliers).finally(() => setLoading(false)),
  [projectId])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(empty); setEditing(null); setModal(true) }
  const openEdit   = (s)  => {
    setForm({ name: s.name, type: s.type || '', contact: s.contact || '' })
    setEditing(s.id)
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast('Nome é obrigatório.', 'error'); return }
    const payload = {
      name:    form.name.trim(),
      type:    form.type    || null,
      contact: form.contact || null,
    }
    setSaving(true)
    try {
      if (editing) {
        await api.suppliers.update(editing, payload)
        toast('Fornecedor atualizado!')
      } else {
        await api.suppliers.create(payload)
        toast('Fornecedor criado!')
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
    if (!confirm('Remover este fornecedor?')) return
    await api.suppliers.delete(id)
    toast('Fornecedor removido.')
    load()
  }

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">FORNECEDORES</h1>
          <p className="page-subtitle">{suppliers.length} cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Novo fornecedor
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" /> Carregando...</div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum fornecedor cadastrado.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Contato</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>
                      {s.type
                        ? <span className="badge badge-dim">{s.type}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      {s.contact
                        ? <span className="td-mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                            <Phone size={11} />{s.contact}
                          </span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-icon edit" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                        <button className="btn-icon danger" onClick={() => handleDelete(s.id)}><Trash2 size={14} /></button>
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
          title={editing ? 'Editar fornecedor' : 'Novo fornecedor'}
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
            <input className="form-input" type="text" placeholder="Ex: Materiais Construção LTDA"
              value={form.name} onChange={e => f('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <input className="form-input" type="text" placeholder="Ex: Material de construção, Mão de obra"
              value={form.type} onChange={e => f('type', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Contato</label>
            <input className="form-input" type="text" placeholder="Ex: (11) 99999-9999"
              value={form.contact} onChange={e => f('contact', e.target.value)} />
          </div>
        </Modal>
      )}
    </div>
  )
}
