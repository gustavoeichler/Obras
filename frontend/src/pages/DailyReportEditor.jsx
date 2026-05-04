import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Cloud, Users, Plus, Minus, Trash2,
  AlertTriangle, FileText, Share2, Camera, Save,
} from 'lucide-react'
import { project, projectsApi } from '../api/client'
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
