import { useEffect, useState } from 'react'
import { UserPlus, Trash2, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { orgApi } from '../api/client'

export default function OrgMembers() {
  const { user } = useAuth()
  const toast = useToast()

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [email,    setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [adding,   setAdding]  = useState(false)

  useEffect(() => {
    if (user?.role !== 'professional' || !user?.is_org_admin) {
      setLoading(false)
      return
    }
    orgApi.listMembers()
      .then(r => setMembers(r.data))
      .catch(() => toast('Erro ao carregar membros.', 'error'))
      .finally(() => setLoading(false))
  }, [user])

  if (user?.role !== 'professional' || !user?.is_org_admin) {
    return (
      <div className="card" style={{ maxWidth: 600 }}>
        Acesso restrito a administradores da organização.
      </div>
    )
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    if (password.length < 6) {
      toast('A senha deve ter ao menos 6 caracteres.', 'error')
      return
    }
    setAdding(true)
    try {
      const res = await orgApi.createMember({ email, password })
      setMembers(prev => [...prev, res.data])
      setEmail('')
      setPassword('')
      toast('Membro criado com sucesso!')
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.error || 'Erro ao criar membro.', 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (memberId, memberEmail) => {
    if (!confirm(`Remover ${memberEmail} da organização?`)) return
    try {
      await orgApi.removeMember(memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
      toast('Membro removido.')
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.error || 'Erro ao remover membro.', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">MEMBROS DA ORGANIZAÇÃO</h1>
          <p className="page-subtitle">Gerencie quem tem acesso aos projetos da sua empresa</p>
        </div>
      </div>

      {/* Add member form */}
      <div className="card" style={{ maxWidth: 560, marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Adicionar membro</h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="form-input"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="form-input"
            type="password"
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" type="submit" disabled={adding}>
              <UserPlus size={14} />
              {adding ? 'Criando...' : 'Criar membro'}
            </button>
          </div>
        </form>
      </div>

      {/* Members table */}
      <div className="card" style={{ maxWidth: 720, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, color: 'var(--text-muted)' }}>Carregando...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--text-muted)' }}>Nenhum membro encontrado.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>E-mail</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Perfil</th>
                <th style={{ padding: '10px 16px', width: 48 }} />
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 14 }}>
                    {m.email}
                    {m.id === user.id && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>(você)</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>
                    {m.is_org_admin
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Shield size={12} /> Admin</span>
                      : 'Membro'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {m.id !== user.id && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px' }}
                        onClick={() => handleRemove(m.id, m.email)}
                        title="Remover membro"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
