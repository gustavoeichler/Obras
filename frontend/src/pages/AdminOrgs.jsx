import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { adminApi } from '../api/client'

const PLANS = ['basic', 'pro', 'enterprise']

export default function AdminOrgs() {
  const { user } = useAuth()
  const toast = useToast()

  const [orgs,    setOrgs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)  // org id being edited
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    adminApi.listOrgs()
      .then(r => setOrgs(r.data))
      .catch(() => toast('Erro ao carregar organizações.', 'error'))
      .finally(() => setLoading(false))
  }, [])

  if (!user?.is_superadmin) {
    return <div className="card" style={{ maxWidth: 600 }}>Acesso restrito a superadministradores.</div>
  }

  const startEdit = (org) => setEditing({
    id:              org.id,
    is_active:       org.is_active,
    plan:            org.plan || '',
    plan_expires_at: org.plan_expires_at ? org.plan_expires_at.slice(0, 10) : '',
    admin_notes:     org.admin_notes || '',
  })

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const payload = {
        is_active:       editing.is_active,
        plan:            editing.plan || null,
        plan_expires_at: editing.plan_expires_at || null,
        admin_notes:     editing.admin_notes || null,
      }
      const res = await adminApi.updateOrg(editing.id, payload)
      setOrgs(prev => prev.map(o => o.id === editing.id ? res.data : o))
      setEditing(null)
      toast('Organização atualizada.')
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.error || 'Erro ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ORGANIZAÇÕES</h1>
          <p className="page-subtitle">Painel administrativo · {orgs.length} organização{orgs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ color: 'var(--text-muted)' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orgs.map(org => (
            <div key={org.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{org.name}</span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                    {org.member_count} membro{org.member_count !== 1 ? 's' : ''}
                  </span>
                  <span style={{
                    marginLeft: 10, fontSize: 11, fontWeight: 600, padding: '2px 8px',
                    borderRadius: 99, background: org.is_active ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)',
                    color: '#fff',
                  }}>
                    {org.is_active ? 'ATIVA' : 'INATIVA'}
                  </span>
                  {org.plan && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                      · {org.plan}
                    </span>
                  )}
                </div>
                {editing?.id !== org.id && (
                  <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => startEdit(org)}>
                    Editar
                  </button>
                )}
              </div>

              {editing?.id === org.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={editing.is_active}
                        onChange={e => setEditing(prev => ({ ...prev, is_active: e.target.checked }))}
                      />
                      Organização ativa
                    </label>

                    <select
                      className="form-input"
                      style={{ width: 140 }}
                      value={editing.plan}
                      onChange={e => setEditing(prev => ({ ...prev, plan: e.target.value }))}
                    >
                      <option value="">Sem plano</option>
                      {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <input
                      className="form-input"
                      type="date"
                      style={{ width: 180 }}
                      value={editing.plan_expires_at}
                      onChange={e => setEditing(prev => ({ ...prev, plan_expires_at: e.target.value }))}
                      placeholder="Expiração do plano"
                    />
                  </div>

                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Notas internas..."
                    value={editing.admin_notes}
                    onChange={e => setEditing(prev => ({ ...prev, admin_notes: e.target.value }))}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
                    <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
