import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Upload, ImageIcon, Send, Users, Grid3x3, Copy, CheckCircle,
  TrendingUp, DollarSign, Layers, Pencil, X, FileText, GitBranch,
} from 'lucide-react'
import { projectsApi, project as projectApi, formatBRL, formatDate } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import HealthBadge from '../components/HealthBadge'
import Overview from '../components/timeline/Overview'

const STATUS_MAP = {
  active:   { label: 'Ativo',      cls: 'badge-green'  },
  paused:   { label: 'Pausado',    cls: 'badge-orange' },
  finished: { label: 'Finalizado', cls: 'badge-dim'    },
}

/* ── Project stats strip ──────────────────────────────────────── */
function ProjectStats({ stats }) {
  if (!stats) return null
  const { progress_pct, total_expenses, stages_done, stages_total } = stats
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
      {/* Progress */}
      <div style={{
        flex: 2, minWidth: 220,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Progresso da obra
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: progress_pct === 100 ? 'var(--green)' : 'var(--accent)', lineHeight: 1 }}>
            {progress_pct}%
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress_pct}%`,
            background: progress_pct === 100 ? 'var(--green)' : 'var(--accent)',
            borderRadius: 3, transition: 'width 800ms ease',
          }} />
        </div>
        {stages_total > 0 && (
          <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            {stages_done}/{stages_total} etapas concluídas
          </div>
        )}
      </div>

      {/* Total spent */}
      <div style={{
        flex: 1, minWidth: 160,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
          <DollarSign size={13} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Total gasto
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--accent)', marginTop: 4 }}>
          {formatBRL(total_expenses)}
        </div>
      </div>

      {/* Stages */}
      <div style={{
        flex: 1, minWidth: 140,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
          <Layers size={13} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Etapas
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text)', marginTop: 4 }}>
          {stages_done}<span style={{ color: 'var(--text-muted)', fontSize: 14 }}>/{stages_total}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Upload zone ──────────────────────────────────────────────── */
function UploadZone({ projectId, stages, onUploaded }) {
  const [mode,      setMode]      = useState('photo')  // 'photo' | 'text'
  const [dragging,  setDragging]  = useState(false)
  const [file,      setFile]      = useState(null)
  const [desc,      setDesc]      = useState('')
  const [stageId,   setStageId]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const fileRef = useRef(null)
  const toast   = useToast()

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setMode('photo') }
  }

  async function submit() {
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      if (file) fd.append('file', file)
      if (desc) fd.append('description', desc)
      if (stageId) fd.append('stage_id', stageId)
      const photo = await projectsApi.uploadPhoto(projectId, fd)
      onUploaded(photo)
      setFile(null)
      setDesc('')
      setStageId('')
      toast('Publicado!', 'success')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao enviar')
    } finally {
      setUploading(false)
    }
  }

  const stageSelect = (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <select
        className="form-select"
        value={stageId}
        onChange={e => setStageId(e.target.value)}
        style={{ fontSize: 13 }}
      >
        <option value="">Etapa (opcional)</option>
        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  )

  return (
    <div className="card" style={{ marginBottom: 28 }}>
      {/* Mode tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)',
      }}>
        {[
          { key: 'photo', icon: <Upload size={12} />,    label: 'Foto'       },
          { key: 'text',  icon: <FileText size={12} />,  label: 'Atualização' },
        ].map(m => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setFile(null); setError('') }}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
              color: mode === m.key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: mode === m.key ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'color var(--transition)',
            }}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 20px' }}>
        {mode === 'photo' && !file && (
          <div
            className={`upload-zone ${dragging ? 'dragging' : ''}`}
            style={{ marginBottom: 0 }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef} type="file" hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={e => e.target.files[0] && setFile(e.target.files[0])}
            />
            <Upload size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--accent)' }}>Clique</strong> ou arraste uma foto
            </p>
          </div>
        )}

        {mode === 'photo' && file && (
          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              style={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 'var(--radius)', flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>{file.name}</p>
              <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
              <button
                onClick={() => { setFile(null); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, marginTop: 4, fontSize: 11, fontFamily: 'var(--font-mono)' }}
              >
                ✕ remover
              </button>
            </div>
          </div>
        )}

        {(mode === 'text' || file) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              className="form-input"
              placeholder={mode === 'text' ? 'Descreva o andamento da obra…' : 'Descrição (opcional)'}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={mode === 'text' ? 3 : 2}
              style={{ resize: 'vertical', fontSize: 13 }}
            />
            {stageSelect}
          </div>
        )}

        {error && <div className="auth-error font-mono" style={{ marginTop: 10, marginBottom: 0 }}>{error}</div>}

        {(mode === 'text' || file) && (
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={uploading || (mode === 'text' && !desc.trim())}
            style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
          >
            {uploading
              ? <><div className="spinner" style={{ width: 13, height: 13 }} /> Publicando…</>
              : <><Send size={13} /> Publicar</>}
          </button>
        )}
      </div>
    </div>
  )
}


/* ── Expenses tab (read-only) ─────────────────────────────────── */
function ExpensesTab({ projectId }) {
  const [expenses, setExpenses] = useState(null)

  useEffect(() => {
    projectApi(projectId).expenses.list().then(setExpenses).catch(() => setExpenses([]))
  }, [projectId])

  if (expenses === null) return <div className="loading"><div className="spinner" /> Carregando…</div>

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  return (
    <div>
      {expenses.length === 0 ? (
        <div className="empty-state">
          <DollarSign size={36} style={{ opacity: 0.2 }} />
          <p className="font-mono">Nenhum gasto registrado.</p>
        </div>
      ) : (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Data', 'Descrição', 'Etapa', 'Categoria', 'Valor'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: h === 'Valor' ? 'right' : 'left',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatDate(e.date)}
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text)' }}>
                    {e.description || '—'}
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {e.stage_name || '—'}
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {e.category_name || '—'}
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {formatBRL(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border-2)' }}>
                <td colSpan={4} style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Total
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--accent)', textAlign: 'right' }}>
                  {formatBRL(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Workflow tab ────────────────────────────────────────────── */
function WorkflowTab({ projectId, navigate }) {
  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">WORKFLOW E APROVAÇÕES</span>
        </div>
        <div className="card-body">
          <p className="font-mono" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Configure checklists de etapas, requisitos de aprovação e marcos de pagamento para gerenciar o progresso da obra de forma estruturada.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/projects/${projectId}/workflow`)}
            style={{ justifyContent: 'center' }}
          >
            <GitBranch size={13} /> Gerenciar Workflow
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Invite panel ─────────────────────────────────────────────── */
function InvitePanel({ projectId }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')
  const [copied,  setCopied]  = useState(false)
  const toast = useToast()

  const inviteLink = result ? `${window.location.origin}/invite/${result.token}` : ''

  async function submit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const inv = await projectsApi.sendInvite(projectId, email)
      setResult(inv)
      setEmail('')
      toast('Convite criado!', 'success')
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-header">
          <span className="card-title">CONVIDAR CLIENTE</span>
        </div>
        <div className="card-body">
          <p className="font-mono" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Gere um link de convite e envie ao cliente pelo canal de sua preferência (WhatsApp, e-mail, etc.).
          </p>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">E-mail do cliente</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="email" className="form-input" placeholder="cliente@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
                <button
                  type="submit" className="btn btn-primary"
                  disabled={loading} style={{ whiteSpace: 'nowrap' }}
                >
                  {loading ? '…' : <><Send size={13} /> Gerar</>}
                </button>
              </div>
            </div>
            {error && <div className="auth-error font-mono">{error}</div>}
          </form>

          {result && (
            <div className="invite-result">
              <p className="font-mono" style={{ fontSize: 12, color: 'var(--green)', marginBottom: 10 }}>
                ✓ Convite criado — compartilhe o link abaixo:
              </p>
              <code className="invite-token font-mono">{inviteLink}</code>
              <button
                className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
                onClick={copyLink}
              >
                {copied ? <><CheckCircle size={12} /> Copiado!</> : <><Copy size={12} /> Copiar link</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Edit project modal ───────────────────────────────────────── */
function EditProjectModal({ project, onSave, onClose }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name:         project.name        || '',
    description:  project.description || '',
    area_m2:      project.area_m2     ?? '',
    budget_total: project.budget_total ?? '',
    status:       project.status      || 'active',
  })
  const [saving, setSaving] = useState(false)

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.name.trim()) { toast('Nome é obrigatório.', 'error'); return }
    setSaving(true)
    try {
      const updated = await projectsApi.update(project.id, {
        name:         form.name.trim(),
        description:  form.description || null,
        area_m2:      form.area_m2 !== '' ? parseFloat(form.area_m2) : null,
        budget_total: form.budget_total !== '' ? parseFloat(form.budget_total) : null,
        status:       form.status,
      })
      toast('Projeto atualizado!')
      onSave(updated)
    } catch {
      toast('Erro ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-lg)', padding: '28px 32px', width: '100%', maxWidth: 480,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.04em' }}>EDITAR PROJETO</span>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Nome *</label>
          <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input className="form-input" value={form.description} onChange={e => f('description', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Área (m²)</label>
            <input className="form-input" type="number" step="0.01" value={form.area_m2} onChange={e => f('area_m2', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Orçamento (R$)</label>
            <input className="form-input" type="number" step="0.01" value={form.budget_total} onChange={e => f('budget_total', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => f('status', e.target.value)}>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function ProjectDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast    = useToast()

  const [project,   setProject]   = useState(null)
  const [photos,    setPhotos]    = useState([])
  const [stats,     setStats]     = useState(null)
  const [stages,    setStages]    = useState([])
  const [tab,       setTab]       = useState('feed')
  const [loading,   setLoading]   = useState(true)
  const [editOpen,  setEditOpen]  = useState(false)
  const [health,    setHealth]    = useState(null)
  const [feedKey,   setFeedKey]   = useState(0)

  const isPro = user?.role === 'professional'

  const loadAll = useCallback(() => {
    return Promise.all([
      projectsApi.get(id),
      projectsApi.getFeed(id),
      projectsApi.getStats(id),
    ]).then(([proj, feed, st]) => {
      setProject(proj)
      setPhotos(feed)
      setStats(st)
    })
  }, [id])

  useEffect(() => {
    if (isPro) projectApi(id).stages.list().then(setStages).catch(() => {})
    projectApi(id).health().then(setHealth).catch(() => {})
  }, [isPro, id])

  useEffect(() => {
    loadAll().catch(console.error).finally(() => setLoading(false))
  }, [loadAll])

  if (loading) return (
    <>
      <Topbar back={{ href: '/projects', label: 'Projetos' }} />
      <div className="loading" style={{ minHeight: '60vh' }}>
        <div className="spinner" /> Carregando projeto…
      </div>
    </>
  )

  if (!project) return null

  const s = STATUS_MAP[project.status] || STATUS_MAP.active

  const TABS = [
    { id: 'feed',    Icon: Grid3x3,    label: 'FEED'     },
    { id: 'expenses',Icon: DollarSign, label: 'GASTOS'   },
    { id: 'workflow',Icon: GitBranch,  label: 'WORKFLOW', proOnly: true },
    { id: 'invite',  Icon: Users,      label: 'CONVIDAR', proOnly: true },
  ]
  const visibleTabs = TABS.filter(t => !t.proOnly || isPro)

  return (
    <div>
      <Topbar back={{ href: '/projects', label: 'Projetos' }} />

      {/* ── Project header ── */}
      <div className="proj-detail-header">
        <div className="proj-detail-header-inner">
          <p className="font-mono" style={{
            fontSize: 10, letterSpacing: '0.12em',
            color: 'var(--text-dim)', marginBottom: 10,
          }}>
            // PROJETO #{String(project.id).padStart(3, '0')}
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{project.name}</h1>
            {isPro && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditOpen(true)}
                style={{ flexShrink: 0 }}
              >
                <Pencil size={12} /> Editar
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 14 }}>
            <span className={`badge ${s.cls}`}>{s.label}</span>
            {project.budget_total && (
              <span className="font-mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Orçamento: <strong style={{ color: 'var(--accent)' }}>{formatBRL(project.budget_total)}</strong>
              </span>
            )}
            {project.area_m2 && (
              <span className="font-mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {project.area_m2} m²
              </span>
            )}
            {project.description && (
              <span className="font-mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {project.description}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="proj-tabs">
            {visibleTabs.map(({ id: tid, Icon, label }) => (
              <button
                key={tid}
                className={`proj-tab ${tab === tid ? 'active' : ''}`}
                onClick={() => setTab(tid)}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="proj-detail-content">
        {health && (tab === 'feed' || tab === 'expenses') && (
          <div className="health-hero">
            <HealthBadge score={health.overall} status={health.status} size={72} />
            <div className="health-hero-body">
              <div className="health-hero-title">SAÚDE DA OBRA</div>
              <div className="health-hero-scores">
                <span>Cronograma <strong>{health.schedule_score}</strong></span>
                <span>Orçamento <strong>{health.budget_score}</strong></span>
                <span>Qualidade <strong>{health.quality_score}</strong></span>
                <span>Tarefas <strong>{health.tasks_score}</strong></span>
                <span>Aprovações <strong>{health.approvals_score}</strong></span>
              </div>
              {health.signals?.length > 0 && (
                <ul className="health-hero-signals">
                  {health.signals.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Stats strip — shown in feed and expenses tabs */}
        {(tab === 'feed' || tab === 'expenses') && (
          <ProjectStats stats={stats} />
        )}

        {tab === 'feed' && (
          <>
            {isPro && (
              <UploadZone
                projectId={id}
                stages={stages}
                onUploaded={() => { setFeedKey(k => k + 1); loadAll() }}
              />
            )}
            <Overview projectId={id} stages={stages} refreshKey={feedKey} />
          </>
        )}
        {tab === 'expenses' && <ExpensesTab projectId={id} />}
        {tab === 'workflow' && isPro && <WorkflowTab projectId={id} navigate={navigate} />}
        {tab === 'invite' && isPro && <InvitePanel projectId={id} />}
      </div>

      {editOpen && (
        <EditProjectModal
          project={project}
          onSave={updated => { setProject(updated); setEditOpen(false) }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}
