import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Hammer, Home, ArrowRight } from 'lucide-react'
import { authApi, projectsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  {
    id:   'professional',
    Icon: Hammer,
    label: 'PROFISSIONAL',
    desc:  'Arquiteto, eng. ou construtor',
  },
  {
    id:   'client',
    Icon: Home,
    label: 'CLIENTE',
    desc:  'Acompanho minha reforma',
  },
]

export default function Register() {
  const [step,     setStep]     = useState(1)
  const [role,     setRole]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const inviteToken = params.get('invite')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.register({ email, password, role })
      login(data.token, data.user)
      if (inviteToken && role === 'client') {
        try { await projectsApi.acceptInvite(inviteToken) } catch (_) { /* best-effort */ }
      }
      nav('/projects')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      {/* ── Hero ── */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <p className="auth-hero-tag font-mono">// NOVO CADASTRO</p>
          <h1 className="auth-wordmark font-display">OBRAS</h1>
          <p className="auth-hero-sub font-mono">
            {step === 1
              ? 'Escolha seu perfil para começar.'
              : role === 'professional'
                ? 'Crie projetos e gerencie sua obra.'
                : 'Acompanhe o andamento da sua reforma.'}
          </p>
          <div className="auth-hero-lines">
            <span /><span /><span />
          </div>
        </div>
        <div className="auth-hero-footer font-mono">
          <span style={{ color: 'var(--accent)' }}>PASSO {step}/2</span>
          &nbsp;—&nbsp;
          {step === 1 ? 'Selecione o perfil' : 'Dados de acesso'}
        </div>
      </div>

      {/* ── Form ── */}
      <div className="auth-form-panel">
        <div className="auth-form">
          <div className="auth-form-header">
            <h2 className="font-display">
              {step === 1 ? 'CRIAR CONTA' : 'SEUS DADOS'}
            </h2>
            <p className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Passo {step} de 2
            </p>
          </div>

          {step === 1 ? (
            <>
              <p className="form-label" style={{ marginBottom: 14 }}>Você é:</p>
              <div className="role-grid">
                {ROLES.map(({ id, Icon, label, desc }) => (
                  <button
                    key={id}
                    type="button"
                    className={`role-card ${role === id ? 'selected' : ''}`}
                    onClick={() => setRole(id)}
                  >
                    {role === id && <span className="role-card-check">✓</span>}
                    <Icon size={26} className="role-card-icon" />
                    <span className="role-card-title font-display">{label}</span>
                    <span className="role-card-desc font-mono">{desc}</span>
                  </button>
                ))}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}
                onClick={() => setStep(2)}
                disabled={!role}
              >
                Continuar <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <form onSubmit={submit}>
              {error && <div className="auth-error font-mono">{error}</div>}

              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email" className="form-input" placeholder="seu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Senha</label>
                <input
                  type="password" className="form-input" placeholder="Mínimo 6 caracteres"
                  value={password} onChange={e => setPassword(e.target.value)}
                  minLength={6} required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button" className="btn btn-ghost"
                  style={{ flex: 1 }} onClick={() => setStep(1)}
                >
                  ← Voltar
                </button>
                <button
                  type="submit" className="btn btn-primary"
                  style={{ flex: 2, justifyContent: 'center' }} disabled={loading}
                >
                  {loading
                    ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Criando…</>
                    : 'Criar conta'}
                </button>
              </div>
            </form>
          )}

          <p className="auth-switch font-mono">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
