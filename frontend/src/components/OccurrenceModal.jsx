import { useState } from 'react'
import Modal from './Modal'

const KINDS = [
  { value: 'delay',             label: 'Atraso' },
  { value: 'material_shortage', label: 'Falta de material' },
  { value: 'weather',           label: 'Clima' },
  { value: 'accident',          label: 'Acidente' },
  { value: 'rework',            label: 'Retrabalho' },
  { value: 'other',             label: 'Outros' },
]

export default function OccurrenceModal({ stages = [], onClose, onSave }) {
  const [kind,        setKind]        = useState('delay')
  const [description, setDescription] = useState('')
  const [stageId,     setStageId]     = useState('')
  const [saving,      setSaving]      = useState(false)

  async function submit() {
    if (!description.trim()) return
    setSaving(true)
    try {
      await onSave({
        kind,
        description: description.trim(),
        stage_id: stageId ? Number(stageId) : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Nova ocorrência"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !description.trim()}>
            {saving ? 'Salvando…' : 'Adicionar'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Tipo *</label>
        <select className="form-select" value={kind} onChange={e => setKind(e.target.value)}>
          {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Descrição *</label>
        <textarea
          className="form-textarea"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="O que aconteceu?"
        />
      </div>
      {stages.length > 0 && (
        <div className="form-group">
          <label className="form-label">Etapa (opcional)</label>
          <select className="form-select" value={stageId} onChange={e => setStageId(e.target.value)}>
            <option value="">—</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
    </Modal>
  )
}

export const OCCURRENCE_LABELS = Object.fromEntries(KINDS.map(k => [k.value, k.label]))
