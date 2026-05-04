import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Modal from './Modal'
import { useToast } from './Toast'

const APPROVAL_ROLES = {
  engineer: 'Engenheiro',
  client_rep: 'Representante do Cliente',
  supervisor: 'Supervisor',
  inspector: 'Inspetor'
}

const STATUS_COLORS = {
  pending: { bg: 'var(--orange-dim)', color: 'var(--orange)', icon: Clock },
  approved: { bg: 'var(--green-dim)', color: 'var(--green)', icon: CheckCircle },
  rejected: { bg: 'var(--red-dim)', color: 'var(--red)', icon: AlertCircle }
}

export const StageApprovalModal = ({ isOpen, onClose, stageId, apiClient }) => {
  const [approvals, setApprovals] = useState([])
  const [selectedRole, setSelectedRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [reviewingId, setReviewingId] = useState(null)
  const toast = useToast()

  useEffect(() => {
    if (isOpen && stageId) {
      fetchApprovals()
    }
  }, [isOpen, stageId])

  const fetchApprovals = async () => {
    try {
      setLoading(true)
      const { data } = await apiClient.get(`/api/stages/${stageId}/approvals`)
      setApprovals(data.approvals || [])
    } catch (err) {
      toast('Erro ao carregar aprovações', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddApproval = async (e) => {
    e.preventDefault()
    if (!selectedRole || !stageId) return

    try {
      const { data } = await apiClient.post(`/api/stages/${stageId}/approvals`, {
        required_role: selectedRole
      })
      setApprovals([...approvals, data])
      setSelectedRole('')
      toast('Requisito de aprovação adicionado', 'success')
    } catch (err) {
      toast('Erro ao adicionar aprovação', 'error')
    }
  }

  const handleSubmitApproval = async (approvalId, status) => {
    try {
      const payload = { status }
      if (status === 'rejected' && rejectionReason) {
        payload.rejection_reason = rejectionReason
      }
      const { data } = await apiClient.patch(`/api/approvals/${approvalId}/review`, payload)
      setApprovals(approvals.map(a => a.id === approvalId ? data : a))
      setReviewingId(null)
      setRejectionReason('')
      toast(status === 'approved' ? 'Aprovado' : 'Rejeitado', 'success')
      await fetchApprovals()
    } catch (err) {
      toast('Erro ao atualizar aprovação', 'error')
    }
  }

  const handleDeleteApproval = async (approvalId) => {
    if (!confirm('Deseja remover este requisito de aprovação?')) return

    try {
      await apiClient.delete(`/api/approvals/${approvalId}`)
      setApprovals(approvals.filter(a => a.id !== approvalId))
      toast('Requisito removido', 'success')
    } catch (err) {
      toast('Erro ao remover', 'error')
    }
  }

  const getAvailableRoles = () => {
    const used = new Set(approvals.map(a => a.required_role))
    return Object.entries(APPROVAL_ROLES).filter(([key]) => !used.has(key))
  }

  const StatusIcon = STATUS_COLORS[approvals.find(a => a.id === reviewingId)?.status || 'pending']?.icon

  return (
    <Modal isOpen={isOpen} title="Aprovações Obrigatórias" onClose={onClose}>
      <div style={{ padding: '20px', minWidth: '450px', maxHeight: '500px', overflowY: 'auto' }}>
        
        {/* Approvals List */}
        <div style={{ marginBottom: '20px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Carregando...</p>
          ) : approvals.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
              Nenhuma aprovação obrigatória definida
            </p>
          ) : (
            approvals.map(approval => {
              const config = STATUS_COLORS[approval.status]
              const Icon = config.icon
              if (reviewingId === approval.id) return null // Hide while reviewing
              
              return (
                <div
                  key={approval.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: config.bg,
                    borderRadius: 'var(--radius)',
                    marginBottom: '8px',
                    border: `1px solid ${config.color}`
                  }}
                >
                  <Icon size={16} style={{ color: config.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: config.color }}>
                      {APPROVAL_ROLES[approval.required_role]}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Status: {approval.status === 'pending' ? 'Pendente' : approval.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </div>
                    {approval.approval_date && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(approval.approval_date).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setReviewingId(approval.id)}
                    style={{
                      background: approval.status === 'pending' ? 'var(--orange)' : 'var(--surface-3)',
                      color: approval.status === 'pending' ? 'white' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: approval.status === 'pending' ? 'pointer' : 'default',
                      opacity: approval.status === 'pending' ? '1' : '0.5'
                    }}
                    disabled={approval.status !== 'pending'}
                  >
                    {approval.status === 'pending' ? 'Revisar' : 'Revisado'}
                  </button>
                  <button
                    onClick={() => handleDeleteApproval(approval.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--red)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Review Form */}
        {reviewingId && (
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
              Revisão de Aprovação
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => handleSubmitApproval(reviewingId, 'approved')}
                style={{
                  flex: 1,
                  background: 'var(--green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  padding: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                ✓ Aprovar
              </button>
              <button
                onClick={() => setReviewingId(null)}
                style={{
                  flex: 1,
                  background: 'var(--surface-3)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '10px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmitApproval(reviewingId, 'rejected')}
                style={{
                  flex: 1,
                  background: 'var(--red)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  padding: '10px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                ✗ Rejeitar
              </button>
            </div>
            {reviewingId && approvals.find(a => a.id === reviewingId)?.status === 'pending' && (
              <textarea
                placeholder="Motivo da rejeição (opcional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '60px'
                }}
              />
            )}
          </div>
        )}

        {/* Add Approval Form */}
        {getAvailableRoles().length > 0 && (
          <form onSubmit={handleAddApproval} style={{ display: 'flex', gap: '8px' }}>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <option value="">Selecionar papel...</option>
              {getAvailableRoles().map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selectedRole}
              style={{
                background: selectedRole ? 'var(--accent)' : 'var(--surface-3)',
                color: selectedRole ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius)',
                padding: '8px 12px',
                cursor: selectedRole ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <Plus size={14} /> Adicionar
            </button>
          </form>
        )}
      </div>
    </Modal>
  )
}

export default StageApprovalModal
