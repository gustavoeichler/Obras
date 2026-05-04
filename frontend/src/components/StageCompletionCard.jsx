import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useToast } from './Toast'

export const StageCompletionCard = ({ stageId, apiClient, onRefresh }) => {
  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (stageId) {
      fetchWorkflow()
    }
  }, [stageId])

  const fetchWorkflow = async () => {
    try {
      setLoading(true)
      const { data } = await apiClient.get(`/api/stages/${stageId}/workflow`)
      setWorkflow(data)
    } catch (err) {
      toast('Erro ao carregar fluxo de trabalho', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!workflow) return null

  const incompletCount = workflow.checklists.filter(c => !c.is_completed).length
  const pendingApprovals = workflow.approvals.filter(a => a.status === 'pending')
  const rejectedApprovals = workflow.approvals.filter(a => a.status === 'rejected')

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          Status de Conclusão
        </h3>
      </div>

      {/* Checklist Status */}
      {workflow.checklists.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          background: incompletCount > 0 ? 'var(--orange-dim)' : 'var(--green-dim)',
          borderRadius: 'var(--radius)',
          marginBottom: '12px',
          border: `1px solid ${incompletCount > 0 ? 'var(--orange)' : 'var(--green)'}`
        }}>
          {incompletCount > 0 ? (
            <AlertCircle size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
          ) : (
            <CheckCircle size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>
              Checklist: {workflow.checklists.filter(c => c.is_completed).length}/{workflow.checklists.length}
            </div>
            {incompletCount > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {incompletCount} itens faltando
              </div>
            )}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: '600',
            color: incompletCount > 0 ? 'var(--orange)' : 'var(--green)'
          }}>
            {workflow.completion_pct}%
          </div>
        </div>
      )}

      {/* Approvals Status */}
      {workflow.approvals.length > 0 && (
        <>
          {pendingApprovals.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--orange-dim)',
              borderRadius: 'var(--radius)',
              marginBottom: '12px',
              border: '1px solid var(--orange)'
            }}>
              <Clock size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                  Pendente Aprovação
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {pendingApprovals.map(a => a.required_role).join(', ')}
                </div>
              </div>
            </div>
          )}

          {rejectedApprovals.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--red-dim)',
              borderRadius: 'var(--radius)',
              marginBottom: '12px',
              border: '1px solid var(--red)'
            }}>
              <AlertCircle size={18} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--red)' }}>
                  Rejeitado
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {rejectedApprovals.map(a => a.required_role).join(', ')}
                </div>
              </div>
            </div>
          )}

          {workflow.approvals.filter(a => a.status === 'approved').length === workflow.approvals.length && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--green-dim)',
              borderRadius: 'var(--radius)',
              marginBottom: '12px',
              border: '1px solid var(--green)'
            }}>
              <CheckCircle size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--green)' }}>
                Todas as aprovações concluídas
              </div>
            </div>
          )}
        </>
      )}

      {/* Completion Blockers */}
      {workflow.completion_blockers.length > 0 && (
        <div style={{
          background: 'var(--red-dim)',
          border: '1px solid var(--red)',
          borderRadius: 'var(--radius)',
          padding: '12px',
          marginTop: '12px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--red)', fontWeight: '500', marginBottom: '8px' }}>
            ⚠️ Razões para não concluir:
          </div>
          <ul style={{ fontSize: '12px', color: 'var(--text)', margin: '0', paddingLeft: '20px' }}>
            {workflow.completion_blockers.map((blocker, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Complete Button */}
      <button
        disabled={!workflow.can_complete || workflow.is_locked}
        style={{
          width: '100%',
          marginTop: '16px',
          padding: '12px',
          background: workflow.can_complete && !workflow.is_locked ? 'var(--green)' : 'var(--surface-3)',
          color: workflow.can_complete && !workflow.is_locked ? 'white' : 'var(--text-muted)',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontSize: '13px',
          fontWeight: '600',
          cursor: workflow.can_complete && !workflow.is_locked ? 'pointer' : 'not-allowed',
          opacity: workflow.can_complete && !workflow.is_locked ? '1' : '0.6'
        }}
        title={!workflow.can_complete ? 'Completa todos os requisitos primeiro' : workflow.is_locked ? 'Etapa está bloqueada' : 'Marcar como concluída'}
      >
        ✓ Concluir Etapa
      </button>
    </div>
  )
}

export default StageCompletionCard
