import { useEffect, useRef, useState } from 'react'
import { Palette, Upload, Trash2 } from 'lucide-react'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../context/BrandingContext'

const THEMES = [
  { value: 'dark',  label: 'Escuro' },
  { value: 'light', label: 'Claro'  },
]

export default function BrandingSettings() {
  const { user } = useAuth()
  const { branding, logoUrl, theme, updateBranding, uploadLogo, deleteLogo } = useBranding()
  const toast = useToast()
  const fileRef = useRef(null)

  const [name,         setName]         = useState(branding.name === 'OBRAS' ? '' : branding.name || '')
  const [color,        setColor]        = useState(branding.primary_color || '#d4a017')
  const [defaultTheme, setDefaultTheme] = useState(branding.default_theme || 'dark')
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    setName(branding.name === 'OBRAS' ? '' : branding.name || '')
    setColor(branding.primary_color || '#d4a017')
    setDefaultTheme(branding.default_theme || 'dark')
  }, [branding.name, branding.primary_color, branding.default_theme])

  if (user?.role !== 'professional') {
    return <div className="card" style={{ maxWidth: 600 }}>Disponível apenas para perfis profissionais.</div>
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateBranding({
        name:          name.trim() || null,
        primary_color: color,
        default_theme: defaultTheme,
      })
      toast('Identidade visual atualizada!')
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadLogo(file)
      toast('Logo atualizado!')
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao enviar logo.', 'error')
    } finally {
      e.target.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('Remover o logo atual?')) return
    try {
      await deleteLogo()
      toast('Logo removido.')
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao remover.', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">IDENTIDADE VISUAL</h1>
          <p className="page-subtitle">
            Personalize a aparência da plataforma para sua marca · tema atual:{' '}
            <strong>{theme === 'light' ? 'claro' : 'escuro'}</strong>
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="form-label" htmlFor="brand-name">Nome da marca</label>
          <input
            id="brand-name"
            className="form-input"
            type="text"
            maxLength={80}
            value={name}
            placeholder="Ex: Construtora Acme"
            onChange={(e) => setName(e.target.value)}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aparece no menu lateral no lugar de "OBRAS".</small>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="form-label" htmlFor="brand-color">Cor principal</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              id="brand-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 56, height: 36, padding: 0, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent' }}
            />
            <input
              className="form-input"
              type="text"
              value={color}
              maxLength={7}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 120, fontFamily: 'var(--font-mono)' }}
            />
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 6, background: color,
              color: '#fff', fontWeight: 600, fontSize: 12,
            }}>
              <Palette size={13} /> Prévia
            </span>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="form-label">Tema padrão da marca</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {THEMES.map((t) => (
              <label key={t.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="default-theme"
                  value={t.value}
                  checked={defaultTheme === t.value}
                  onChange={() => setDefaultTheme(t.value)}
                />
                {t.label}
              </label>
            ))}
          </div>
          <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Os usuários ainda podem escolher claro/escuro individualmente no menu lateral.
          </small>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="form-label">Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {logoUrl
                ? <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                : <span style={{ color: 'var(--text-muted)', fontSize: 12 }} style={{ fontSize: 11 }}>Sem logo</span>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Enviar imagem
            </button>
            {logoUrl && (
              <button className="btn btn-ghost" onClick={handleRemoveLogo}>
                <Trash2 size={14} /> Remover
              </button>
            )}
          </div>
          <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>PNG, JPG, WebP ou SVG · máx. 2 MB.</small>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? 'Salvando...' : 'Salvar identidade'}
          </button>
        </div>
      </div>
    </div>
  )
}
