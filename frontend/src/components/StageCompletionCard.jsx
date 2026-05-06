import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useToast } from './Toast'

export const StageCompletionCard = ({ stageId, apiClient, onRefresh }) => {
  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (stageId) fetchWorkflow()
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
  const allApproved = workflow.approvals.length > 0 &&
    workflow.approvals.filter(a => a.status === 'approved').length === workflow.approvals.length
  const canComplete = workflow.can_complete && !workflow.is_locked

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          Status de Conclusão
        </h3>
      </div>

      {workflow.checklists.length > 0 && (
        <div className={`status-box ${incompletCount > 0 ? 'status-box--orange' : 'status-box--green'}`}>
          {incompletCount > 0
            ? <AlertCircle size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
            : <CheckCircle size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
          }
          <div className="status-box-body">
            <div className="status-box-title">
              Checklist: {workflow.checklists.filter(c => c.is_completed).length}/{workflow.checklists.length}
            </div>
            {incompletCount > 0 && (
              <div className="status-box-sub">{incompletCount} itens faltando</div>
            )}
          </div>
          <div className="status-box-value">{workflow.completion_pct}%</div>
        </div>
      )}

      {pendingApprovals.length > 0 && (
        <div className="status-box status-box--orange">
          <Clock size={18} style={{ color: 'var(--orange)', flexShrink: 0 }} />
          <div className="status-box-body">
            <div className="status-box-title">Pendente Aprovação</div>
            <div className="status-box-sub">{pendingApprovals.map(a => a.required_role).join(', ')}</div>
          </div>
        </div>
      )}

      {rejectedApprovals.length > 0 && (
        <div className="status-box status-box--red">
          <AlertCircle size={18} style={{ color: 'var(--red)', flexShrink: 0 }} />
          <div className="status-box-body">
            <div className="status-box-title" style={{ color: 'var(--red)' }}>Rejeitado</div>
            <div className="status-box-sub">{rejectedApprovals.map(a => a.required_role).join(', ')}</div>
          </div>
        </div>
      )}

      {allApproved && (
        <div className="status-box status-box--green">
          <CheckCircle size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <div className="status-box-title" style={{ color: 'var(--green)' }}>
            Todas as aprovações concluídas
          </div>
        </div>
      )}

      {workflow.completion_blockers.length > 0 && (
        <div className="status-box status-box--red" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
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

      <button
        disabled={!canComplete}
        className={`status-complete-btn ${canComplete ? 'status-complete-btn--enabled' : 'status-complete-btn--disabled'}`}
        title={!workflow.can_complete ? 'Completa todos os requisitos primeiro' : workflow.is_locked ? 'Etapa está bloqueada' : 'Marcar como concluída'}
      >
        ✓ Concluir Etapa
      </button>
    </div>
  )
}

export default StageCompletionCard
