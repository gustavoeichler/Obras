import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Cloud, Users, Plus, Minus, Trash2,
  AlertTriangle, FileText, Share2, Camera, Save,
  ChevronRight, ListChecks,
} from 'lucide-react'
import { project, projectsApi, projectStagesApi, tasksApi } from '../api/client'
import { useToast } from '../components/Toast'
import MicRecorderButton from '../components/MicRecorderButton'
import OccurrenceModal, { OCCURRENCE_LABELS } from '../components/OccurrenceModal'
import { authed } from '../api/client'

const DEFAULT_ROLES = ['pedreiro', 'servente', 'oficial', 'eletricista', 'encanador']

export default function DailyReportEditor() {
  const { id: projectId, rid } = useParams()
  const api    = project(projectId)
  const nav    = useNavigate()
  const toast  = useToast()
  const [rdo, setRdo] = useState(null)
  const [stages, setStages] = useState([])
  const [savingNotes, setSavingNotes] = useState(false)
  const [occurrenceModal, setOccurrenceModal] = useState(false)
  const fileRef = useRef(null)
  const [expandedStages, setExpandedStages] = useState({})
  const [stageTasks, setStageTasks] = useState({})
  const [tasksFetched, setTasksFetched] = useState({})

  const load = useCallback(() =>
    api.dailyReports.get(rid).then(setRdo)
  , [projectId, rid])

  useEffect(() => {
    load().catch(() => toast('Erro ao carregar RDO', 'error'))
    api.stages.list().then(setStages).catch(() => {})
  }, [load])

  if (!rdo) return <div className="loading"><div className="spinner" /> Carregando…</div>

  function patch(payload) {
    return api.dailyReports.update(rid, payload).then(setRdo)
  }

  async function saveNotes(notes) {
    setSavingNotes(true)
    try { await patch({ notes }) }
    catch { toast('Erro ao salvar', 'error') }
    finally { setSavingNotes(false) }
  }

  function setHeadcount(role, delta) {
    const list = [...(rdo.headcount_json || [])]
    const idx  = list.findIndex(h => h.role === role)
    if (idx >= 0) {
      list[idx] = { ...list[idx], count: Math.max(0, list[idx].count + delta) }
      if (list[idx].count === 0) list.splice(idx, 1)
    } else if (delta > 0) {
      list.push({ role, count: 1 })
    }
    patch({ headcount_json: list }).catch(() => toast('Erro ao salvar', 'error'))
  }

  async function addOccurrence(data) {
    await api.dailyReports.addOccurrence(rid, data)
    await load()
    toast('Ocorrência registrada')
  }

  async function removeOccurrence(occId) {
    if (!confirm('Remover esta ocorrência?')) return
    await api.dailyReports.deleteOccurrence(rid, occId)
    await load()
  }

  async function uploadPhoto(file) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('daily_report_id', rid)
    fd.append('type', 'progress')
    try {
      await projectsApi.uploadPhoto(projectId, fd)
      await load()
      toast('Foto adicionada')
    } catch {
      toast('Erro ao enviar foto', 'error')
    }
  }

  function openPdf() {
    // POST then fetch in new tab — easiest is to open the URL after generating.
    authed().post(api.dailyReports.pdfUrl(rid), null, { responseType: 'blob' })
      .then(r => {
        const url = URL.createObjectURL(r.data)
        window.open(url, '_blank')
      })
      .catch(() => toast('Erro ao gerar PDF', 'error'))
  }

  async function copyShareLink() {
    try {
      const { url } = await api.dailyReports.shareLink(rid)
      await navigator.clipboard.writeText(url)
      toast('Link copiado!')
    } catch {
      toast('Erro ao gerar link', 'error')
    }
  }

  async function toggleStage(stageId) {
    const willOpen = !expandedStages[stageId]
    setExpandedStages(prev => ({ ...prev, [stageId]: willOpen }))
    if (willOpen && !tasksFetched[stageId]) {
      try {
        const tasks = await tasksApi.list(stageId)
        setStageTasks(prev => ({ ...prev, [stageId]: tasks }))
        setTasksFetched(prev => ({ ...prev, [stageId]: true }))
      } catch {
        toast('Erro ao carregar tarefas', 'error')
      }
    }
  }

  async function closeStage(stageId) {
    if (!confirm('Marcar etapa como concluída?')) return
    try {
      await projectStagesApi.updateStatus(stageId, { status: 'concluida' })
      setStages(prev => prev.map(s => s.id === stageId ? { ...s, status: 'concluida' } : s))
      toast('Etapa concluída')
    } catch {
      toast('Erro ao concluir etapa', 'error')
    }
  }

  async function toggleTask(stageId, taskId, isDone) {
    try {
      await tasksApi.update(taskId, { is_done: isDone })
      setStageTasks(prev => ({
        ...prev,
        [stageId]: (prev[stageId] || []).map(t =>
          t.id === taskId ? { ...t, is_done: isDone } : t
        ),
      }))
    } catch {
      toast('Erro ao atualizar tarefa', 'error')
    }
  }

  async function addNote(data) {
    try {
      await api.dailyReports.addNote(rid, data)
      await load()
    } catch {
      toast('Erro ao salvar nota', 'error')
    }
  }

  async function deleteNote(noteId) {
    try {
      await api.dailyReports.deleteNote(rid, noteId)
      await load()
    } catch {
      toast('Erro ao remover nota', 'error')
    }
  }

  function saveNoteOnBlur(e, noteData) {
    const value = e.target.value.trim()
    if (!value) return
    addNote({ ...noteData, comment: value })
    e.target.value = ''
  }

  return (
    <div className="rdo-editor">
      <button className="topbar-back" onClick={() => nav(`/projects/${projectId}/daily-reports`)}>
        <ArrowLeft size={12} /> Voltar
      </button>

      <h1 className="page-title" style={{ marginTop: 8 }}>
        RDO {new Date(rdo.report_date + 'T00:00:00').toLocaleDateString('pt-BR')}
      </h1>

      {/* Weather */}
      <section className="card" style={{ marginBottom: 14 }}>
        <div className="rdo-section-h"><Cloud size={14} /> Clima</div>
        <div className="rdo-weather">
          <input
            className="form-input"
            placeholder="Ex: Chuva fraca"
            value={rdo.weather || ''}
            onBlur={e => patch({ weather: e.target.value || null })}
            onChange={e => setRdo(r => ({ ...r, weather: e.target.value }))}
          />
          <input
            className="form-input"
            type="number"
            placeholder="Temp °C"
            value={rdo.weather_temp_c ?? ''}
            onBlur={e => patch({ weather_temp_c: e.target.value === '' ? null : Number(e.target.value) })}
            onChange={e => setRdo(r => ({ ...r, weather_temp_c: e.target.value === '' ? null : Number(e.target.value) }))}
            style={{ maxWidth: 110 }}
          />
        </div>
      </section>

      {/* Headcount */}
      <section className="card" style={{ marginBottom: 14 }}>
        <div className="rdo-section-h"><Users size={14} /> Equipe em campo</div>
        <div className="rdo-chips">
          {DEFAULT_ROLES.map(role => {
            const entry = (rdo.headcount_json || []).find(h => h.role === role)
            const count = entry?.count || 0
            return (
              <div key={role} className={`rdo-chip${count ? ' active' : ''}`}>
                <button className="btn-icon" onClick={() => setHeadcount(role, -1)}><Minus size={12} /></button>
                <span className="rdo-chip-count">{count}</span>
                <span className="rdo-chip-label">{role}</span>
                <button className="btn-icon" onClick={() => setHeadcount(role, +1)}><Plus size={12} /></button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Notes */}
      <section className="card" style={{ marginBottom: 14 }}>
        <div className="rdo-section-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><FileText size={14} /> Atividades / observações</span>
          <MicRecorderButton onAppend={(text) => {
            const next = (rdo.notes || '') + (rdo.notes && !rdo.notes.endsWith(' ') ? ' ' : '') + text
            setRdo(r => ({ ...r, notes: next }))
            saveNotes(next)
          }} />
        </div>
        <textarea
          className="form-textarea"
          rows={5}
          placeholder="O que foi feito hoje?"
          value={rdo.notes || ''}
          onChange={e => setRdo(r => ({ ...r, notes: e.target.value }))}
          onBlur={e => saveNotes(e.target.value)}
        />
        {savingNotes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Salvando…</div>}
      </section>

      {/* Occurrences */}
      <section className="card" style={{ marginBottom: 14 }}>
        <div className="rdo-section-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><AlertTriangle size={14} /> Ocorrências</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setOccurrenceModal(true)}>
            <Plus size={12} /> Adicionar
          </button>
        </div>
        {(!rdo.occurrences || rdo.occurrences.length === 0) ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma ocorrência.</div>
        ) : (
          <ul className="rdo-occurrences">
            {rdo.occurrences.map(o => (
              <li key={o.id}>
                <span className={`rdo-occ-kind kind-${o.kind}`}>{OCCURRENCE_LABELS[o.kind] || o.kind}</span>
                <span style={{ flex: 1 }}>{o.description}</span>
                <button className="btn-icon danger" onClick={() => removeOccurrence(o.id)}>
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Stages & Tasks */}
      <section className="card" style={{ marginBottom: 14 }}>
        <div className="rdo-section-h">
          <ListChecks size={14} /> Etapas e Tarefas
        </div>
        {stages.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma etapa cadastrada.</div>
        ) : (
          <div className="rdo-stages">
            {stages.map(stage => {
              const isExpanded = !!expandedStages[stage.id]
              const tasks = stageTasks[stage.id] || []
              const stageNotes = (rdo.rdo_notes || []).filter(n => n.stage_id === stage.id)
              return (
                <div key={stage.id} className="rdo-stage">
                  <div className="rdo-stage-header" onClick={() => toggleStage(stage.id)}>
                    <ChevronRight size={12} className={`rdo-chevron${isExpanded ? ' open' : ''}`} />
                    <span className="rdo-stage-name">{stage.name}</span>
                    {stage.status === 'concluida' ? (
                      <span className="rdo-stage-badge done">Concluída</span>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); closeStage(stage.id) }}
                      >
                        Concluir
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="rdo-stage-body">
                      <input
                        className="form-input rdo-note-input"
                        placeholder="Nota sobre esta etapa…"
                        onKeyDown={e => { if (e.key === 'Enter') saveNoteOnBlur(e, { stage_id: stage.id }) }}
                        onBlur={e => saveNoteOnBlur(e, { stage_id: stage.id })}
                      />
                      {stageNotes.map(n => (
                        <div key={n.id} className="rdo-note-item">
                          <span>{n.comment}</span>
                          <button className="btn-icon danger" onClick={() => deleteNote(n.id)}>
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                      {tasks.map(task => {
                        const taskNotes = (rdo.rdo_notes || []).filter(n => n.task_id === task.id)
                        return (
                          <div key={task.id} className="rdo-task">
                            <div className="rdo-task-row">
                              <input
                                type="checkbox"
                                checked={!!task.is_done}
                                onChange={e => toggleTask(stage.id, task.id, e.target.checked)}
                              />
                              <span className={task.is_done ? 'rdo-task-done' : ''}>{task.name}</span>
                            </div>
                            <input
                              className="form-input rdo-note-input"
                              placeholder="Nota sobre esta tarefa…"
                              onKeyDown={e => { if (e.key === 'Enter') saveNoteOnBlur(e, { task_id: task.id }) }}
                              onBlur={e => saveNoteOnBlur(e, { task_id: task.id })}
                            />
                            {taskNotes.map(n => (
                              <div key={n.id} className="rdo-note-item">
                                <span>{n.comment}</span>
                                <button className="btn-icon danger" onClick={() => deleteNote(n.id)}>
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Photos */}
      <section className="card" style={{ marginBottom: 14 }}>
        <div className="rdo-section-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><Camera size={14} /> Fotos</span>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
            <Plus size={12} /> Adicionar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
          />
        </div>
        {(rdo.photos?.length || 0) === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma foto.</div>
        ) : (
          <div className="rdo-photos">
            {rdo.photos.map(p => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="rdo-photo">
                <img src={p.url} alt="" />
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="rdo-actions">
        <button className="btn btn-ghost" onClick={openPdf}>
          <Save size={14} /> Gerar PDF
        </button>
        <button className="btn btn-primary" onClick={copyShareLink}>
          <Share2 size={14} /> Compartilhar com cliente
        </button>
      </div>

      {occurrenceModal && (
        <OccurrenceModal
          stages={stages}
          onClose={() => setOccurrenceModal(false)}
          onSave={addOccurrence}
        />
      )}
    </div>
  )
}
