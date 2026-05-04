import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, ArrowRight, Building2 } from 'lucide-react'
import { projectsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function AcceptInvite() {
  const { token } = useParams()
  const { user }  = useAuth()
  const nav       = useNavigate()

  const [invite,    setInvite]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [accepted,  setAccepted]  = useState(false)
  const [error,     setError]     = useState('')
  const [notFound,  setNotFound]  = useState(false)

  useEffect(() => {
    projectsApi.getInvite(token)
      .then(setInvite)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  async function accept() {
    setAccepting(true)
    try {
      await projectsApi.acceptInvite(token)
      setAccepted(true)
      setTimeout(() => nav('/projects'), 2500)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="invite-page">
      <div className="invite-card">
        {/* Brand */}
        <div style={{ marginBottom: 36 }}>
          <p className="font-mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--accent)', marginBottom: 4 }}>
            // OBRAS — CONVITE
          </p>
          <h1 className="font-display" style={{ fontSize: 30, letterSpacing: '0.05em' }}>OBRAS</h1>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Carregando convite…</div>

        ) : notFound ? (
          <div style={{ textAlign: 'center' }}>
            <XCircle size={44} style={{ color: 'var(--red)', margin: '0 auto 16px' }} />
            <h2 className="font-display" style={{ fontSize: 22, letterSpacing: '0.04em', marginBottom: 8 }}>
              CONVITE INVÁLIDO
            </h2>
            <p className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
              Este link não existe ou já expirou.
            </p>
            <Link to="/login" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
              Ir para o login
            </Link>
          </div>

        ) : accepted ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={44} style={{ color: 'var(--green)', margin: '0 auto 16px' }} />
            <h2 className="font-display" style={{ fontSize: 22, letterSpacing: '0.04em', marginBottom: 8 }}>
              CONVITE ACEITO
            </h2>
            <p className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Você foi adicionado ao projeto. Redirecionando…
            </p>
          </div>

        ) : invite?.accepted ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={44} style={{ color: 'var(--text-dim)', margin: '0 auto 16px' }} />
            <h2 className="font-display" style={{ fontSize: 22, letterSpacing: '0.04em', marginBottom: 8 }}>
              JÁ ACEITO
            </h2>
            <p className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
              Este convite já foi utilizado anteriormente.
            </p>
            <Link to="/projects" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Ver meus projetos
            </Link>
          </div>

        ) : (
          <>
            {/* Invite info card */}
            <div className="card" style={{ marginBottom: 28 }}>
              <div className="card-body">
                <p className="font-mono" style={{
                  fontSize: 10, letterSpacing: '0.12em',
                  color: 'var(--text-dim)', marginBottom: 10,
                }}>
                  VOCÊ FOI CONVIDADO PARA
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Building2 size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <h2 className="font-display" style={{ fontSize: 24, letterSpacing: '0.03em' }}>
                    {invite?.project_name || 'Projeto'}
                  </h2>
                </div>
                {invite?.expires_at && (
                  <p className="font-mono" style={{
                    fontSize: 11, color: 'var(--text-dim)',
                    marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <Clock size={10} />
                    Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {user ? (
              user.role === 'client' ? (
                <div>
                  {error && <div className="auth-error font-mono" style={{ marginBottom: 14 }}>{error}</div>}
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                    onClick={accept}
                    disabled={accepting}
                  >
                    {accepting
                      ? <><div className="spinner" style={{ width: 13, height: 13 }} /> Aceitando…</>
                      : <><CheckCircle size={14} /> Aceitar convite</>}
                  </button>
                  <Link
                    to="/projects"
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', display: 'flex' }}
                  >
                    Agora não
                  </Link>
                </div>
              ) : (
                <div className="invite-warn font-mono">
                  Apenas clientes podem aceitar convites.<br />
                  Faça logout e crie uma conta de cliente para continuar.
                </div>
              )
            ) : (
              <div>
                <p className="font-mono" style={{
                  fontSize: 12, color: 'var(--text-muted)',
                  textAlign: 'center', marginBottom: 20, lineHeight: 1.6,
                }}>
                  Para aceitar o convite, você precisa de uma conta de cliente.
                </p>
                <Link
                  to={`/register?invite=${token}`}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', display: 'flex', marginBottom: 10 }}
                >
                  <ArrowRight size={14} /> Criar conta para aceitar
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0' }}>
                  <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>OU</span>
                  <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
                </div>

                <Link
                  to="/login"
                  state={{ after: `/invite/${token}` }}
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', display: 'flex' }}
                >
                  Já tenho conta — entrar
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
