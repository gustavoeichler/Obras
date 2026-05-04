import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, ChevronRight, DollarSign, Calendar } from 'lucide-react'
import { projectsApi, formatBRL, healthApi } from '../api/client'
import HealthBadge from '../components/HealthBadge'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'

const STATUS_MAP = {
  active:   { label: 'Ativo',      cls: 'badge-green'  },
  paused:   { label: 'Pausado',    cls: 'badge-orange' },
  finished: { label: 'Finalizado', cls: 'badge-dim'    },
}

/* ── Create modal ─────────────────────────────────────────────── */
function CreateModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState({ name: '', description: '', budget_total: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function upd(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const p = await projectsApi.create({
        name:         form.name,
        description:  form.description  || undefined,
        budget_total: form.budget_total ? Number(form.budget_total) : undefined,
      })
      onCreated(p)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">NOVO PROJETO</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && (
              <div className="auth-error font-mono" style={{ marginBottom: 16 }}>{error}</div>
            )}
            <div className="form-group">
              <label className="form-label">Nome do projeto *</label>
              <input
                type="text" className="form-input"
                placeholder="ex: Reforma Apartamento Centro"
                value={form.name} onChange={e => upd('name', e.target.value)} required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea
                className="form-textarea" placeholder="Descreva o escopo da obra…"
                value={form.description} onChange={e => upd('description', e.target.value)}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Orçamento total (R$)</label>
              <input
                type="number" className="form-input" placeholder="ex: 150000"
                value={form.budget_total} onChange={e => upd('budget_total', e.target.value)}
                min={0}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Criando…' : 'Criar projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function Projects() {
  const { user }  = useAuth()
  const [projects, setProjects] = useState([])
  const [healthMap, setHealthMap] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const nav   = useNavigate()
  const toast = useToast()

  useEffect(() => {
    projectsApi.list()
      .then(setProjects)
      .catch(() => toast('Erro ao carregar projetos', 'error'))
      .finally(() => setLoading(false))
    healthApi.summary()
      .then(arr => setHealthMap(Object.fromEntries(arr.map(h => [h.project_id, h]))))
      .catch(() => {})
  }, [])

  function handleCreated(p) {
    setProjects(prev => [p, ...prev])
    setModal(false)
    toast('Projeto criado!', 'success')
  }

  const isPro = user?.role === 'professional'

  return (
    <div className="proj-dash">
      <Topbar />

      <div className="proj-dash-inner">
        {/* Header */}
        <div className="page-header">
          <div>
            <p className="page-subtitle">
              {loading ? '…' : `${projects.length} projeto${projects.length !== 1 ? 's' : ''}`}
            </p>
            <h1 className="page-title">PROJETOS</h1>
          </div>
          {isPro && (
            <button className="btn btn-primary" onClick={() => setModal(true)}>
              <Plus size={14} /> Novo projeto
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading"><div className="spinner" /> Carregando projetos…</div>
        ) : projects.length === 0 ? (
          <div className="empty-state proj-empty">
            <FolderOpen size={48} />
            <p className="font-display" style={{ fontSize: 24, letterSpacing: '0.04em', marginBottom: 8 }}>
              {isPro ? 'NENHUM PROJETO' : 'SEM PROJETOS'}
            </p>
            <p>
              {isPro
                ? 'Crie seu primeiro projeto para começar.'
                : 'Aguarde o convite de um profissional.'}
            </p>
            {isPro && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 20 }}
                onClick={() => setModal(true)}
              >
                <Plus size={14} /> Criar projeto
              </button>
            )}
          </div>
        ) : (
          <div className="proj-grid">
            {projects.map((p, i) => {
              const s = STATUS_MAP[p.status] || STATUS_MAP.active
              return (
                <div
                  key={p.id}
                  className="proj-card"
                  style={{ animationDelay: `${i * 0.055}s` }}
                  onClick={() => nav(`/projects/${p.id}`)}
                >
                  <div className="proj-card-top">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="proj-card-index font-mono">
                        #{String(p.id).padStart(3, '0')}
                      </p>
                      <h3 className="proj-card-name font-display">{p.name}</h3>
                    </div>
                    {healthMap[p.id] && (
                      <HealthBadge
                        score={healthMap[p.id].overall}
                        status={healthMap[p.id].status}
                        size={48}
                      />
                    )}
                    <span className={`badge ${s.cls}`}>{s.label}</span>
                  </div>

                  {p.description && (
                    <p className="proj-card-desc font-mono">{p.description}</p>
                  )}

                  <div className="proj-card-meta">
                    {p.budget_total && (
                      <span className="proj-meta-chip">
                        <DollarSign size={10} /> {formatBRL(p.budget_total)}
                      </span>
                    )}
                    {p.created_at && (
                      <span className="proj-meta-chip">
                        <Calendar size={10} />
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>

                  <div className="proj-card-footer">
                    <span className="proj-card-cta font-mono">
                      Ver projeto <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && <CreateModal onClose={() => setModal(false)} onCreated={handleCreated} />}
    </div>
  )
}
