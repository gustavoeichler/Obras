import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useParams } from 'react-router-dom'
import { project } from '../api/client'

export default function Categories() {
  const { id: projectId } = useParams()
  const api = project(projectId)
  const toast = useToast()
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [editing,    setEditing]    = useState(null)
  const [name,       setName]       = useState('')
  const [saving,     setSaving]     = useState(false)

  const load = useCallback(() =>
    api.categories.list().then(setCategories).finally(() => setLoading(false)),
  [projectId])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setName(''); setEditing(null); setModal(true) }
  const openEdit   = (c) => { setName(c.name); setEditing(c.id); setModal(true) }

  const handleSave = async () => {
    if (!name.trim()) { toast('Nome é obrigatório.', 'error'); return }
    setSaving(true)
    try {
      if (editing) {
        await api.categories.update(editing, { name: name.trim() })
        toast('Categoria atualizada!')
      } else {
        await api.categories.create({ name: name.trim() })
        toast('Categoria criada!')
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
    if (!confirm('Remover esta categoria?')) return
    await api.categories.delete(id)
    toast('Categoria removida.')
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CATEGORIAS</h1>
          <p className="page-subtitle">{categories.length} cadastradas</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Nova categoria
        </button>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        {loading ? (
          <div className="loading"><div className="spinner" /> Carregando...</div>
        ) : categories.length === 0 ? (
          <div className="empty-state">
            <Tag size={40} />
            <p>Nenhuma categoria cadastrada.<br />Crie categorias para classificar os gastos.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-icon edit" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                        <button className="btn-icon danger" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
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
          title={editing ? 'Editar categoria' : 'Nova categoria'}
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
            <input
              className="form-input"
              type="text"
              placeholder="Ex: Materiais, Mão de obra, Aluguel"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              autoFocus
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
