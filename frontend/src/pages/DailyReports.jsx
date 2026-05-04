import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ClipboardList, Plus, Camera, AlertTriangle, ChevronRight } from 'lucide-react'
import { project } from '../api/client'
import { useToast } from '../components/Toast'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function groupByMonth(reports) {
  const out = {}
  for (const r of reports) {
    const dt = new Date(r.report_date + 'T00:00:00')
    const key = dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    if (!out[key]) out[key] = []
    out[key].push(r)
  }
  return out
}

export default function DailyReports() {
  const { id: projectId } = useParams()
  const api    = project(projectId)
  const nav    = useNavigate()
  const toast  = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dailyReports.list()
      .then(setItems)
      .catch(() => toast('Erro ao carregar RDOs', 'error'))
      .finally(() => setLoading(false))
  }, [projectId])

  async function createToday() {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const r = await api.dailyReports.create({ report_date: today })
      nav(`/projects/${projectId}/daily-reports/${r.id}`)
    } catch (e) {
      toast('Erro ao criar RDO', 'error')
    }
  }

  const grouped = groupByMonth(items)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">DIÁRIO DE OBRA</h1>
          <p className="page-subtitle">{items.length} relatório(s)</p>
        </div>
        <button className="btn btn-primary" onClick={createToday}>
          <Plus size={14} /> RDO de hoje
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Carregando…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <p style={{ marginTop: 14 }}>Nenhum RDO ainda.</p>
          <button className="btn btn-primary" onClick={createToday} style={{ marginTop: 16 }}>
            <Plus size={14} /> Criar o primeiro
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([month, list]) => (
          <div key={month} style={{ marginBottom: 24 }}>
            <div className="nav-group-label" style={{ marginBottom: 8 }}>{month}</div>
            <div className="card" style={{ padding: 0 }}>
              {list.map(r => (
                <button
                  key={r.id}
                  className="rdo-row"
                  onClick={() => nav(`/projects/${projectId}/daily-reports/${r.id}`)}
                >
                  <div className="rdo-row-date">
                    <div className="rdo-row-day">
                      {new Date(r.report_date + 'T00:00:00').getDate()}
                    </div>
                    <div className="rdo-row-month">
                      {new Date(r.report_date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                    </div>
                  </div>
                  <div className="rdo-row-body">
                    <div className="rdo-row-title">{fmtDate(r.report_date)}</div>
                    <div className="rdo-row-meta">
                      {r.weather && <span>{r.weather}{r.weather_temp_c != null ? ` · ${Math.round(r.weather_temp_c)}°C` : ''}</span>}
                      {r.photos?.length > 0 && <span><Camera size={11} /> {r.photos.length}</span>}
                      {r.occurrences?.length > 0 && <span className="rdo-occ"><AlertTriangle size={11} /> {r.occurrences.length}</span>}
                    </div>
                    {r.notes && <div className="rdo-row-notes">{r.notes.slice(0, 140)}{r.notes.length > 140 ? '…' : ''}</div>}
                  </div>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
