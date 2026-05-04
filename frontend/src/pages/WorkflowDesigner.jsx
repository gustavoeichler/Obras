import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  GripVertical, Plus, Settings, Lock, Unlock, AlertCircle,
  CheckCircle, Clock
} from 'lucide-react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import StageChecklistModal from '../components/StageChecklistModal'
import StageApprovalModal from '../components/StageApprovalModal'
import { authed, formatDate } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function WorkflowDesigner() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(false)
  const [draggedStage, setDraggedStage] = useState(null)
  const [checklistModalOpen, setChecklistModalOpen] = useState(false)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState(null)

  useEffect(() => {
    fetchStages()
  }, [projectId])

  const fetchStages = async () => {
    try {
      setLoading(true)
      const { data } = await authed().get(`/api/projects/${projectId}/stages`)
      // Sort by order, but handle nulls at the end
      const sorted = [...data].sort((a, b) => {
        if (a.order === null && b.order === null) return 0
        if (a.order === null) return 1
        if (b.order === null) return -1
        return a.order - b.order
      })
      setStages(sorted)
    } catch (err) {
      toast('Erro ao carregar etapas', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (e, stageId) => {
    setDraggedStage(stageId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetStageId) => {
    e.preventDefault()
    if (!draggedStage || draggedStage === targetStageId) return

    const draggedIndex = stages.findIndex(s => s.id === draggedStage)
    const targetIndex = stages.findIndex(s => s.id === targetStageId)
    
    const newStages = [...stages]
    [newStages[draggedIndex], newStages[targetIndex]] = [newStages[targetIndex], newStages[draggedIndex]]
    
    const stageIds = newStages.map(s => s.id)
    
    try {
      await authed().patch(`/api/projects/${projectId}/stages/order`, {
        stage_ids: stageIds
      })
      setStages(newStages)
      toast('Ordem atualizada', 'success')
    } catch (err) {
      toast('Erro ao reordenar etapas', 'error')
      fetchStages()
    } finally {
      setDraggedStage(null)
    }
  }

  const handleLockToggle = async (stageId, isLocked) => {
    try {
      const endpoint = isLocked ? 'unlock' : 'lock'
      await authed().patch(`/api/stages/${stageId}/${endpoint}`)
      setStages(stages.map(s => 
        s.id === stageId ? { ...s, is_locked: !isLocked } : s
      ))
      toast(isLocked ? 'Etapa desbloqueada' : 'Etapa bloqueada', 'success')
    } catch (err) {
      toast('Erro ao atualizar bloqueio', 'error')
    }
  }

  const openChecklistModal = (stageId) => {
    setSelectedStageId(stageId)
    setChecklistModalOpen(true)
  }

  const openApprovalModal = (stageId) => {
    setSelectedStageId(stageId)
    setApprovalModalOpen(true)
  }

  if (user?.role !== 'professional') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlertCircle size={32} style={{ margin: '0 auto 12px', color: 'var(--red)' }} />
        <p>Apenas profissionais podem acessar o designer de fluxo de trabalho</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Topbar />
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
            Designer de Fluxo de Trabalho
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Arraste para reordenar etapas. Configure checklist e aprovações para cada etapa.
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Carregando...</p>
        ) : stages.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Nenhuma etapa no projeto</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stages.map((stage, idx) => (
              <div
                key={stage.id}
                draggable
                onDragStart={(e) => handleDragStart(e, stage.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                style={{
                  background: draggedStage === stage.id ? 'var(--accent-dim)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  cursor: 'move',
                  opacity: draggedStage === stage.id ? 0.7 : 1,
                  transition: 'all 200ms'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  
                  {/* Drag Handle */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '100%',
                    color: 'var(--text-muted)',
                    flexShrink: 0
                  }}>
                    <GripVertical size={18} />
                  </div>

                  {/* Stage Number & Title */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        background: 'var(--accent)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                        {stage.name}
                      </h3>
                    </div>

                    {/* Stage Dates */}
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      {stage.planned_start_date && stage.planned_end_date
                        ? `${formatDate(stage.planned_start_date)} → ${formatDate(stage.planned_end_date)}`
                        : 'Datas não definidas'
                      }
                    </div>

                    {/* Stage Badges */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Progress Badge */}
                      <div style={{
                        background: stage.completion_pct === 100 ? 'var(--green-dim)' : 'var(--orange-dim)',
                        color: stage.completion_pct === 100 ? 'var(--green)' : 'var(--orange)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {stage.completion_pct === 100 ? <CheckCircle size={11} /> : <Clock size={11} />}
                        {stage.completion_pct}% completa
                      </div>

                      {/* Lock Badge */}
                      {stage.is_locked && (
                        <div style={{
                          background: 'var(--orange-dim)',
                          color: 'var(--orange)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Lock size={11} /> Bloqueada
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {/* Checklist Button */}
                    <button
                      onClick={() => openChecklistModal(stage.id)}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'background 200ms'
                      }}
                      title="Gerenciar checklist"
                      onMouseEnter={(e) => e.target.style.background = 'var(--surface-3)'}
                      onMouseLeave={(e) => e.target.style.background = 'var(--surface-2)'}
                    >
                      <Settings size={14} /> Checklist
                    </button>

                    {/* Approval Button */}
                    <button
                      onClick={() => openApprovalModal(stage.id)}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'background 200ms'
                      }}
                      title="Gerenciar aprovações"
                      onMouseEnter={(e) => e.target.style.background = 'var(--surface-3)'}
                      onMouseLeave={(e) => e.target.style.background = 'var(--surface-2)'}
                    >
                      <Settings size={14} /> Aprovações
                    </button>

                    {/* Lock/Unlock Button */}
                    <button
                      onClick={() => handleLockToggle(stage.id, stage.is_locked)}
                      style={{
                        background: stage.is_locked ? 'var(--orange-dim)' : 'var(--surface-2)',
                        border: `1px solid ${stage.is_locked ? 'var(--orange)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: stage.is_locked ? 'var(--orange)' : 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 200ms'
                      }}
                      title={stage.is_locked ? 'Desbloquear etapa' : 'Bloquear etapa'}
                    >
                      {stage.is_locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <StageChecklistModal
        isOpen={checklistModalOpen}
        onClose={() => setChecklistModalOpen(false)}
        stageId={selectedStageId}
        apiClient={authed()}
      />
      <StageApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        stageId={selectedStageId}
        apiClient={authed()}
      />
    </div>
  )
}
