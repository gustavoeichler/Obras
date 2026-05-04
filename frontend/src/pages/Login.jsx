import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login } = useAuth()
  const nav      = useNavigate()
  const location = useLocation()
  const after    = location.state?.after || '/projects'

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login({ email, password })
      login(data.token, data.user)
      nav(after)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      {/* ── Hero ── */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <p className="auth-hero-tag font-mono">// SISTEMA v2.0</p>
          <h1 className="auth-wordmark font-display">OBRAS</h1>
          <p className="auth-hero-sub font-mono">
            Gestão profissional de reformas.<br />
            Controle total, visibilidade total.
          </p>
          <div className="auth-hero-lines">
            <span /><span /><span />
          </div>
        </div>
        <div className="auth-hero-footer font-mono">
          <Zap size={11} style={{ color: 'var(--accent)' }} />
          Plataforma SaaS para profissionais de construção
        </div>
      </div>

      {/* ── Form ── */}
      <div className="auth-form-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-form-header">
            <h2 className="font-display">ENTRAR</h2>
            <p className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Acesse sua conta
            </p>
          </div>

          {error && <div className="auth-error font-mono">{error}</div>}

          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              type="email"
              className="form-input"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
                }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {loading
              ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Entrando…</>
              : 'Entrar'}
          </button>

          <p className="auth-switch font-mono">
            Ainda não tem conta?{' '}
            <Link to="/register">Criar conta grátis</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
