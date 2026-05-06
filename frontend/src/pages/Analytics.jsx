import { useEffect, useState, useCallback } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  Ruler, BarChart2, Activity, Settings, Gauge,
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import { project, projectsApi, formatBRL } from '../api/client'

// ── Tooltip ───────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border-2)',
      borderRadius: 'var(--radius)', padding: '10px 14px',
      fontFamily: 'var(--font-mono)', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {formatBRL(p.value)}
        </div>
      ))}
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, color = 'var(--accent)', alert, badge }) {
  return (
    <div className="stat-card" style={{
      borderColor: alert ? 'rgba(244,63,94,.3)' : undefined,
    }}>
      <div className="stat-icon" style={{ background: color + '18', color }}>
        <Icon size={18} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 24, color }}>
        {value ?? <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>—</span>}
      </div>
      {badge && (
        <div style={{
          display: 'inline-block', marginTop: 6, padding: '2px 8px',
          borderRadius: 999, background: color + '18', color,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.04em',
          textTransform: 'uppercase',
        }}>{badge}</div>
      )}
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ── Project settings inline ───────────────────────────────────
function ProjectSettings({ projectId, onSaved }) {
  const [proj,    setProj]    = useState(null)
  const [area,    setArea]    = useState('')
  const [name,    setName]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [open,    setOpen]    = useState(false)

  useEffect(() => {
    projectsApi.get(projectId).then(p => {
      setProj(p)
      setArea(p.area_m2 || '')
      setName(p.name || '')
    })
  }, [projectId])

  const save = async () => {
    setSaving(true)
    await projectsApi.update(projectId, { name, area_m2: area ? parseFloat(area) : null })
    setSaving(false)
    setOpen(false)
    onSaved()
  }

  return (
    <div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Settings size={13} />
        {proj ? `${proj.name}${proj.area_m2 ? ` · ${proj.area_m2} m²` : ''}` : 'Configurar projeto'}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '110%', zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-lg)', padding: 20, width: 280,
          boxShadow: '0 16px 48px rgba(0,0,0,.5)',
        }}>
          <div className="form-group">
            <label className="form-label">Nome da obra</label>
            <input className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Área (m²)</label>
            <input className="form-input" type="number" step="0.1" min="0" placeholder="Ex: 70"
              value={area} onChange={e => setArea(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Deviation indicator ───────────────────────────────────────
function DeviationCard({ dev, cpi }) {
  if (!dev || dev.error) return (
    <MetricCard icon={BarChart2} label="Desvio orçamentário" value={null} sub="sem orçamento cadastrado" />
  )

  const over  = dev.deviation > 0
  const exact = dev.deviation === 0
  const Icon  = over ? TrendingUp : exact ? Minus : TrendingDown
  const color = over ? 'var(--red)' : exact ? 'var(--text-muted)' : 'var(--green)'
  const label = over ? 'acima do orçamento' : exact ? 'dentro do orçamento' : 'abaixo do orçamento'

  return (
    <div className="stat-card" style={{ borderColor: over ? 'rgba(244,63,94,.3)' : undefined }}>
      <div className="stat-icon" style={{ background: color + '18', color }}>
        <Icon size={18} />
      </div>
      <div className="stat-label">Desvio orçamentário</div>
      <div className="stat-value" style={{ fontSize: 24, color }}>
        {over ? '+' : ''}{dev.percent.toFixed(1)}%
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)',
        marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <span>Previsto: {formatBRL(dev.planned)}</span>
        <span>Realizado: {formatBRL(dev.realized)}</span>
        <span style={{ color }}>{label}</span>
        {cpi != null && (
          <span style={{ color: cpi >= 1 ? 'var(--green)' : 'var(--red)' }}>
            CPI {cpi.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Forecast / EAC card ───────────────────────────────────────
const METHOD_LABEL = {
  evm:           'progresso de obra',
  stage_avg:     'progresso de obra (média)',
  time_smoothed: 'ritmo recente',
  none:          '—',
}

const CONFIDENCE_LABEL = {
  high:     'alta confiança',
  medium:   'média confiança',
  low:      'baixa confiança',
  very_low: 'estimativa fraca',
}

function ForecastCard({ fc }) {
  if (!fc || fc.current_spent === 0) {
    return (
      <MetricCard icon={TrendingUp} label="Previsão final (EAC)" value={null}
        sub="sem gastos cadastrados" color="var(--orange)" />
    )
  }

  const hasBudget = fc.budget_total > 0
  const overBudget = hasBudget && fc.vac != null && fc.vac < 0
  const color = fc.confidence === 'very_low'
    ? 'var(--text-muted)'
    : overBudget ? 'var(--red)' : hasBudget ? 'var(--green)' : 'var(--orange)'

  const sub = hasBudget && fc.vac != null
    ? `${fc.vac >= 0 ? 'sobra' : 'excede'} ${formatBRL(Math.abs(fc.vac))} vs orçamento`
    : `gasto atual: ${formatBRL(fc.current_spent)}`

  return (
    <MetricCard
      icon={TrendingUp}
      label="Previsão final (EAC)"
      value={formatBRL(fc.forecast_final)}
      sub={sub}
      badge={`${METHOD_LABEL[fc.method] || fc.method} · ${CONFIDENCE_LABEL[fc.confidence] || fc.confidence}`}
      color={color}
      alert={overBudget}
    />
  )
}

// ── Progresso físico vs tempo ─────────────────────────────────
function ProgressCard({ fc }) {
  if (!fc || fc.days_total === 0) {
    return <MetricCard icon={Activity} label="Progresso físico vs tempo" value={null} sub="sem dados" color="var(--blue)" />
  }
  const physical = fc.pct_complete != null ? Math.round(fc.pct_complete * 100) : null
  const temporal = Math.round(fc.pct_time_elapsed * 100)
  const ahead = physical != null && physical >= temporal
  const color = physical == null ? 'var(--text-muted)' : ahead ? 'var(--green)' : 'var(--red)'

  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '18', color }}>
        <Activity size={18} />
      </div>
      <div className="stat-label">Progresso físico vs tempo</div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        <ProgressRow label="Físico"  pct={physical} color="var(--accent)" placeholder="sem etapas" highlight />
        <ProgressRow label="Tempo"   pct={temporal} color="var(--blue)"   />
      </div>
    </div>
  )
}

function ProgressRow({ label, pct, color, placeholder, highlight }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: highlight ? 10 : undefined,
        fontFamily: highlight ? 'var(--font-mono)' : undefined,
        letterSpacing: highlight ? '0.08em' : undefined,
        textTransform: highlight ? 'uppercase' : undefined,
        marginBottom: highlight ? 6 : undefined,
      }}>
        {!highlight && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{label}</span>
            <span style={{ color: 'var(--text)' }}>{pct == null ? '—' : `${pct}%`}</span>
          </div>
        )}
        {highlight && <span>{label}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct ?? 0}%`,
            background: pct === 100 ? 'var(--green)' : color,
            borderRadius: 3, transition: 'width 800ms ease',
          }} />
        </div>
        {highlight && (
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1,
            color: pct == null ? 'var(--text-muted)' : pct === 100 ? 'var(--green)' : color,
          }}>
            {pct == null ? '—' : `${pct}%`}
          </span>
        )}
      </div>
      {pct == null && placeholder && (
        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{placeholder}</div>
      )}
    </div>
  )
}

// ── Saúde do projeto ──────────────────────────────────────────
function HealthCard({ fc }) {
  if (!fc || fc.budget_total <= 0) return null
  const rows = [
    {
      label: 'CPI',
      value: fc.cpi,
      explain: 'Eficiência de custo. >1 = dentro do orçamento.',
      goodWhen: v => v >= 1,
    },
    {
      label: 'SPI',
      value: fc.spi,
      explain: 'Eficiência de prazo. >1 = adiantado.',
      goodWhen: v => v >= 1,
    },
    {
      label: 'VAC',
      value: fc.vac,
      explain: 'Variância prevista no fim. Positivo = sobra, negativo = excede.',
      goodWhen: v => v >= 0,
      format: formatBRL,
    },
  ]
  return (
    <div className="card" style={{ marginTop: 16, padding: 0 }}>
      <div className="card-header">
        <span className="card-title">Saúde do projeto</span>
        <Gauge size={14} style={{ color: 'var(--text-muted)' }} />
      </div>
      <div style={{ padding: '8px 0' }}>
        {rows.map(r => {
          const has = r.value != null
          const good = has && r.goodWhen(r.value)
          const color = !has ? 'var(--text-muted)' : good ? 'var(--green)' : 'var(--red)'
          return (
            <div key={r.label} className="health-row" style={{
              display: 'grid', gridTemplateColumns: '70px 1fr auto',
              alignItems: 'center', padding: '12px 24px',
              borderTop: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)', fontSize: 12,
            }}>
              <span style={{ color, fontWeight: 700, fontSize: 14 }}>{r.label}</span>
              <span style={{ color: 'var(--text-muted)' }}>{r.explain}</span>
              <span style={{ color, fontWeight: 600 }}>
                {has ? (r.format ? r.format(r.value) : r.value.toFixed(2)) : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function Analytics() {
  const { id: projectId } = useParams()
  const api = project(projectId)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.analytics.summary()
      .then(setData)
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => { load() }, [load])

  const curve   = data?.s_curve          ?? []
  const cpm2    = data?.cost_per_m2
  const dev     = data?.budget_deviation
  const fc      = data?.forecast

  const formatX = (d) => {
    if (!d) return ''
    const [, m, day] = d.split('-')
    return `${day}/${m}`
  }

  const hasPlanned = curve.some(p => p.planned != null)
  const showWarning = fc?.warning && (fc.confidence === 'low' || fc.confidence === 'very_low')

  return (
    <div>
      <div className="page-header" style={{ position: 'relative' }}>
        <div>
          <h1 className="page-title">ANALYTICS</h1>
          <p className="page-subtitle">indicadores financeiros · curva de gastos</p>
        </div>
        <ProjectSettings projectId={projectId} onSaved={load} />
      </div>

      {showWarning && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(240,180,41,.08)', border: '1px solid rgba(240,180,41,.3)',
          borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16,
          color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12,
        }}>
          <AlertTriangle size={14} />
          <span>{fc.warning}</span>
        </div>
      )}

      <div className="stat-grid" style={{ marginBottom: 28 }}>
        {cpm2 && !cpm2.error ? (
          <MetricCard
            icon={Ruler}
            label={`Custo por m² (${cpm2.area_m2} m²)`}
            value={formatBRL(cpm2.cost_per_m2)}
            sub={`total: ${formatBRL(cpm2.total_spent)}`}
            color="var(--blue)"
          />
        ) : (
          <MetricCard icon={Ruler} label="Custo por m²" value={null}
            sub="configure a área em Configurar projeto" color="var(--blue)" />
        )}

        <DeviationCard dev={dev} cpi={fc?.cpi} />

        <ForecastCard fc={fc} />

        <ProgressCard fc={fc} />
      </div>

      {/* S-Curve */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Curva de Gastos (S-Curve)</span>
          {curve.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
              {formatBRL(curve[curve.length - 1]?.value)}
            </span>
          )}
        </div>
        <div style={{ padding: '24px 8px 16px' }}>
          {loading ? (
            <div className="loading"><div className="spinner" /> Carregando...</div>
          ) : curve.length < 2 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <BarChart2 size={40} style={{ margin: '0 auto 12px' }} />
              <p>Poucos dados para gerar o gráfico.<br />Adicione pelo menos 2 gastos com datas.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={curve} margin={{ top: 4, right: 24, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="sCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f0b429" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f0b429" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatX}
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}
                  stroke="var(--border)"
                />
                <YAxis
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}
                  stroke="var(--border)"
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: 11 }} />

                {fc?.budget_total > 0 && (
                  <ReferenceLine
                    y={fc.budget_total}
                    stroke="rgba(240,180,41,.4)"
                    strokeDasharray="6 3"
                    label={{ value: 'Orçamento', position: 'right', fill: 'var(--accent)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="value"
                  name="Realizado"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#sCurveGrad)"
                  dot={curve.length < 20 ? { r: 3, fill: 'var(--accent)', strokeWidth: 0 } : false}
                  activeDot={{ r: 5, fill: 'var(--accent)' }}
                />
                {hasPlanned && (
                  <Line
                    type="monotone"
                    dataKey="planned"
                    name="Planejado"
                    stroke="var(--blue)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <HealthCard fc={fc} />

      {fc && fc.days_total > 0 && (
        <div className="card" style={{ marginTop: 16, padding: 0 }}>
          <div className="card-header">
            <span className="card-title">Progresso temporal do projeto</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
              {fc.days_elapsed} de {fc.days_total} dias
            </span>
          </div>
          <div style={{ padding: '16px 24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>Início</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                {Math.round(fc.pct_time_elapsed * 100)}% decorrido
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>Fim previsto</span>
            </div>
            <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${fc.pct_time_elapsed * 100}%`,
                background: fc.pct_time_elapsed > 0.8
                  ? 'linear-gradient(90deg, var(--orange), var(--red))'
                  : 'linear-gradient(90deg, var(--accent), var(--orange))',
                borderRadius: 4,
                transition: 'width 600ms ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                Gasto atual: <strong style={{ color: 'var(--text)' }}>{formatBRL(fc.current_spent)}</strong>
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                Ritmo recente: <strong style={{ color: 'var(--text)' }}>{formatBRL(fc.recent_daily_spend)}/dia</strong>
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                Previsão final: <strong style={{ color: 'var(--orange)' }}>{formatBRL(fc.forecast_final)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
