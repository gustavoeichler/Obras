import { useEffect, useState } from 'react'
import { TrendingDown, TrendingUp, HelpCircle } from 'lucide-react'

/**
 * Tiny chip showing how an expense's unit price compares to the
 * anonymized peer median. Calls the per-expense benchmark endpoint.
 */
export default function BenchmarkChip({ projectApi, expenseId }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    projectApi.dailyReports.expenseBenchmark(expenseId)
      .then(d => { if (alive) setData(d) })
      .catch(() => { if (alive) setData({ status: 'error' }) })
    return () => { alive = false }
  }, [expenseId])

  if (!data) return null
  if (data.status !== 'ok' || data.delta_pct === undefined) {
    return (
      <span className="bench-chip bench-chip-dim" title="Dados insuficientes para comparar">
        <HelpCircle size={11} /> sem comparativo
      </span>
    )
  }
  const delta = data.delta_pct
  const cls = delta > 5 ? 'bench-chip-bad' : delta < -5 ? 'bench-chip-good' : 'bench-chip-dim'
  const Icon = delta > 0 ? TrendingUp : TrendingDown
  const sign = delta > 0 ? '+' : ''
  return (
    <span className={`bench-chip ${cls}`}
          title={`Média de mercado: ${data.avg?.toFixed(2)} · n=${data.n}`}>
      <Icon size={11} /> {sign}{delta.toFixed(0)}% vs. média
    </span>
  )
}
