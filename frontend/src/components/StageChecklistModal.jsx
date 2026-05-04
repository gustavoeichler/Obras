import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import Modal from './Modal'
import { useToast } from './Toast'

export const StageChecklistModal = ({ isOpen, onClose, stageId, apiClient }) => {
  const [items, setItems] = useState([])
  const [newItemText, setNewItemText] = useState('')
  const [loading, setLoading] = useState(false)
  const [completionPct, setCompletionPct] = useState(0)
  const toast = useToast()

  useEffect(() => {
    if (isOpen && stageId) {
      fetchChecklistItems()
    }
  }, [isOpen, stageId])

  const fetchChecklistItems = async () => {
    try {
      setLoading(true)
      const { data } = await apiClient.get(`/api/stages/${stageId}/checklists`)
      setItems(data.items || [])
      setCompletionPct(data.completion_pct || 0)
    } catch (err) {
      toast('Erro ao carregar checklist', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItemText.trim()) return

    try {
      const { data } = await apiClient.post(`/api/stages/${stageId}/checklists`, {
        description: newItemText
      })
      setItems([...items, data])
      setNewItemText('')
      toast('Item adicionado', 'success')
      // Recalculate completion
      await fetchChecklistItems()
    } catch (err) {
      toast('Erro ao adicionar item', 'error')
    }
  }

  const handleToggleItem = async (itemId, isCompleted) => {
    try {
      const { data } = await apiClient.patch(`/api/checklists/${itemId}/toggle`, {
        is_completed: !isCompleted
      })
      setItems(items.map(item => item.id === itemId ? data : item))
      await fetchChecklistItems()
      toast(data.is_completed ? 'Item marcado como concluído' : 'Item desmarcado', 'success')
    } catch (err) {
      toast('Erro ao atualizar item', 'error')
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Deseja remover este item?')) return

    try {
      await apiClient.delete(`/api/checklists/${itemId}`)
      setItems(items.filter(item => item.id !== itemId))
      await fetchChecklistItems()
      toast('Item removido', 'success')
    } catch (err) {
      toast('Erro ao remover item', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} title="Checklist da Etapa" onClose={onClose}>
      <div style={{ padding: '20px', minWidth: '400px', maxHeight: '500px', overflowY: 'auto' }}>
        
        {/* Completion Progress */}
        <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Conclusão
            </span>
            <span style={{ fontSize: '18px', fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
              {completionPct}%
            </span>
          </div>
          <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${completionPct}%`,
              background: completionPct === 100 ? 'var(--green)' : 'var(--accent)',
              transition: 'width 300ms ease'
            }} />
          </div>
        </div>

        {/* Items List */}
        <div style={{ marginBottom: '16px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Carregando...</p>
          ) : items.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
              Nenhum item no checklist
            </p>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: item.is_completed ? 'var(--green-dim)' : 'var(--surface-2)',
                  borderRadius: 'var(--radius)',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'background 200ms'
                }}
                onClick={() => handleToggleItem(item.id, item.is_completed)}
              >
                <button
                  style={{
                    background: item.is_completed ? 'var(--green)' : 'var(--surface-3)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: item.is_completed ? 'white' : 'var(--text-muted)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleItem(item.id, item.is_completed)
                  }}
                >
                  {item.is_completed && <Check size={14} />}
                </button>
                <span
                  style={{
                    flex: 1,
                    textDecoration: item.is_completed ? 'line-through' : 'none',
                    color: item.is_completed ? 'var(--text-muted)' : 'var(--text)',
                    fontSize: '14px'
                  }}
                >
                  {item.description}
                </span>
                <button
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--red)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteItem(item.id)
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Item Form */}
        <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Novo item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text)',
              fontSize: '13px'
            }}
          />
          <button
            type="submit"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px'
            }}
          >
            <Plus size={14} /> Adicionar
          </button>
        </form>
      </div>
    </Modal>
  )
}

export default StageChecklistModal
