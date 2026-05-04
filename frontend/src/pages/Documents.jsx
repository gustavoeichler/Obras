import { useEffect, useState, useCallback, useRef } from 'react'
import { Upload, Trash2, Download, Eye, FileText, Image, File, Plus } from 'lucide-react'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useParams } from 'react-router-dom'
import { project } from '../api/client'

const TYPE_LABELS = {
  invoice:   'Nota fiscal',
  contract:  'Contrato',
  blueprint: 'Planta',
  other:     'Outro',
}

const TYPE_COLORS = {
  invoice:   { color: 'var(--green)',  bg: 'var(--green-dim)'  },
  contract:  { color: 'var(--blue)',   bg: 'var(--blue-dim)'   },
  blueprint: { color: 'var(--orange)', bg: 'var(--orange-dim)' },
  other:     { color: 'var(--text-muted)', bg: 'var(--surface-3)' },
}

function FileIcon({ mime, size = 32 }) {
  if (!mime) return <File size={size} />
  if (mime.startsWith('image/')) return <Image size={size} style={{ color: 'var(--blue)' }} />
  if (mime === 'application/pdf') return <FileText size={size} style={{ color: 'var(--red)' }} />
  return <File size={size} />
}

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Upload zone ───────────────────────────────────────────────
function UploadZone({ onFile }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handle = (file) => { if (file) onFile(file) }

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
      style={{
        border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-2)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '40px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragging ? 'var(--accent-dim)' : 'transparent',
        transition: 'all var(--transition)',
        marginBottom: 24,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={(e) => handle(e.target.files[0])}
      />
      <Upload size={28} style={{ color: dragging ? 'var(--accent)' : 'var(--text-muted)', margin: '0 auto 12px' }} />
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text)' }}>
        Arraste um arquivo ou <span style={{ color: 'var(--accent)', fontWeight: 600 }}>clique para selecionar</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
        PDF · JPG · PNG · máx. 10 MB
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function Documents() {
  const { id: projectId } = useParams()
  const api = project(projectId)
  const toast = useToast()
  const [docs,       setDocs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('all')
  const [modal,      setModal]      = useState(false)
  const [pending,    setPending]    = useState(null)   // File object waiting to upload
  const [form,       setForm]       = useState({ name: '', type: 'other' })
  const [uploading,  setUploading]  = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.documents.list()
      .then(setDocs)
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => { load() }, [load])

  const onFile = (file) => {
    setPending(file)
    setForm({ name: file.name.replace(/\.[^.]+$/, ''), type: 'other' })
    setModal(true)
  }

  const handleUpload = async () => {
    if (!pending) return
    const fd = new FormData()
    fd.append('file', pending)
    fd.append('name', form.name || pending.name)
    fd.append('type', form.type)
    setUploading(true)
    try {
      await api.documents.upload(fd)
      toast('Documento enviado!')
      setModal(false)
      setPending(null)
      load()
    } catch (err) {
      const msg = err.response?.data?.errors?.file?.[0] || 'Erro no upload.'
      toast(msg, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Remover "${name}"?`)) return
    await api.documents.delete(id)
    toast('Documento removido.')
    load()
  }

  const filtered = filter === 'all' ? docs : docs.filter(d => d.type === filter)

  const counts = docs.reduce((acc, d) => ({ ...acc, [d.type]: (acc[d.type] || 0) + 1 }), {})

  const tabs = [
    { key: 'all', label: 'Todos', count: docs.length },
    ...Object.keys(TYPE_LABELS).map(k => ({ key: k, label: TYPE_LABELS[k], count: counts[k] || 0 })),
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">DOCUMENTOS</h1>
          <p className="page-subtitle">{docs.length} arquivo(s) · notas, contratos, plantas</p>
        </div>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          <Plus size={15} /> Enviar arquivo
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = '' }}
          />
        </label>
      </div>

      {/* Upload zone (only when no docs) */}
      {!loading && docs.length === 0 && (
        <UploadZone onFile={onFile} />
      )}

      {/* Filter tabs */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              className={`btn btn-ghost btn-sm`}
              onClick={() => setFilter(t.key)}
              style={{
                borderColor: filter === t.key ? 'var(--accent)' : undefined,
                color: filter === t.key ? 'var(--accent)' : undefined,
                background: filter === t.key ? 'var(--accent-dim)' : undefined,
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{
                  marginLeft: 6, background: 'var(--surface-3)',
                  borderRadius: 100, padding: '0 6px',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Document grid */}
      {loading ? (
        <div className="loading"><div className="spinner" /> Carregando...</div>
      ) : filtered.length === 0 && docs.length > 0 ? (
        <div className="card">
          <div className="empty-state"><p>Nenhum documento nesta categoria.</p></div>
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(doc => {
            const tc = TYPE_COLORS[doc.type] || TYPE_COLORS.other
            const isImage = doc.mime_type?.startsWith('image/')
            return (
              <div key={doc.id} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12,
                transition: 'border-color var(--transition)',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Icon + type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 44, height: 44,
                    background: tc.bg, borderRadius: 'var(--radius)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileIcon mime={doc.mime_type} size={22} />
                  </div>
                  <span className="badge" style={{ background: tc.bg, color: tc.color, border: 'none', fontSize: 10 }}>
                    {TYPE_LABELS[doc.type] || doc.type}
                  </span>
                </div>

                {/* Name */}
                <div>
                  <div style={{
                    fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
                    color: 'var(--text)', marginBottom: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={doc.name}>
                    {doc.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {doc.original_filename}
                  </div>
                </div>

                {/* Meta */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{formatSize(doc.file_size)}</span>
                  <span>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('pt-BR') : '—'}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {isImage && (
                    <a
                      href={api.documents.downloadUrl(doc.id, true)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-icon"
                      style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Visualizar"
                    >
                      <Eye size={14} />
                    </a>
                  )}
                  <a
                    href={api.documents.downloadUrl(doc.id)}
                    download
                    className="btn-icon edit"
                    style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Baixar"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    className="btn-icon danger"
                    style={{ flex: 1 }}
                    onClick={() => handleDelete(doc.id, doc.name)}
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Upload modal */}
      {modal && pending && (
        <Modal
          title="Enviar documento"
          onClose={() => { setModal(false); setPending(null) }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setModal(false); setPending(null) }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Enviando...' : 'Confirmar upload'}
              </button>
            </>
          }
        >
          {/* File preview */}
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <FileIcon mime={pending.type} size={20} />
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{pending.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{formatSize(pending.size)}</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nome do documento *</label>
            <input className="form-input" type="text" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </div>
  )
}
