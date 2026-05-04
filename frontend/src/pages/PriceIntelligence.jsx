import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { priceIntelligenceApi, formatBRL } from '../api/client'
import { useToast } from '../components/Toast'

export default function PriceIntelligence() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    priceIntelligenceApi.overview()
      .then(setItems)
      .catch(() => toast('Erro ao carregar preços', 'error'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">PREÇOS DE MERCADO</h1>
          <p className="page-subtitle">Comparativo anônimo entre profissionais</p>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Carregando…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>Sem dados suficientes para comparar ainda.</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Registre quantidade e unidade nos seus gastos para começar a ver
            comparativos com a média de mercado.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th style={{ textAlign: 'right' }}>Sua média</th>
                <th style={{ textAlign: 'right' }}>Mediana mercado</th>
                <th style={{ textAlign: 'right' }}>Δ</th>
                <th style={{ textAlign: 'right' }}>n</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const Icon = it.delta_pct > 0 ? TrendingUp : TrendingDown
                const cls  = it.delta_pct > 5 ? 'bench-chip-bad'
                          : it.delta_pct < -5 ? 'bench-chip-good' : 'bench-chip-dim'
                return (
                  <tr key={it.category_id}>
                    <td>{it.category_name}</td>
                    <td className="td-amount">{formatBRL(it.your_avg)}</td>
                    <td className="td-amount">{formatBRL(it.peer_median)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`bench-chip ${cls}`}>
                        <Icon size={11} />{it.delta_pct > 0 ? '+' : ''}{it.delta_pct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="td-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{it.n}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
