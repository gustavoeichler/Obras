import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Plus, Trash2, Calculator, Save,
  ClipboardCopy, FileSpreadsheet, FileDown, FileUp,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useToast } from '../components/Toast'
import { project, formatBRL } from '../api/client'
import './BOM.css'

let _seq = 1
const newKey = (prefix) => `${prefix}_${Date.now().toString(36)}_${_seq++}`
const priceKey = (pkey, skey) => `${pkey}:${skey}`

const emptyState = () => ({
  quotationId: null,
  name: 'NOVA COTAÇÃO',
  products: [],
  stores: [],
  prices: {},
  result: null,             // full payload from /optimize: { best, results, ... }
  selectedMethod: null,     // null = follow result.best
  dirty: false,
})

export default function BOM() {
  const { id: projectId } = useParams()
  const api = project(projectId)
  const toast = useToast()
  const fileInputRef = useRef(null)

  const [state, setState]           = useState(emptyState)
  const [quotations, setQuotations] = useState([])
  const [busy, setBusy]              = useState(false)

  const { products, stores, prices, result, selectedMethod } = state

  // Active strategy drives cell highlights, plan breakdown, and the stamp total.
  // Falls back to result.best when no method is explicitly picked.
  const activeResult = useMemo(() => {
    if (!result) return null
    const list = result.results || []
    if (selectedMethod) {
      const hit = list.find(r => r.method === selectedMethod && r.feasible)
      if (hit) return hit
    }
    return result.best || null
  }, [result, selectedMethod])

  const activeMethod = activeResult?.method || null

  // ── Load quotation list ──────────────────────────────────────────────────
  const refreshList = useCallback(
    () => api.bom.list().then(setQuotations).catch(() => {}),
    [projectId],
  )
  useEffect(() => { refreshList() }, [refreshList])

  // ── Mutations ────────────────────────────────────────────────────────────
  const dirty = (s) => ({ ...s, dirty: true, result: null })

  const setProductField = (idx, field, value) =>
    setState(s => dirty({
      ...s,
      products: s.products.map((p, i) => i === idx ? { ...p, [field]: value } : p),
    }))

  const setStoreField = (idx, field, value) =>
    setState(s => dirty({
      ...s,
      stores: s.stores.map((st, i) => i === idx ? { ...st, [field]: value } : st),
    }))

  const setPriceCell = (pkey, skey, raw) =>
    setState(s => {
      const v = String(raw).replace(',', '.').trim()
      const num = v === '' ? null : (Number.isFinite(parseFloat(v)) ? parseFloat(v) : null)
      return dirty({ ...s, prices: { ...s.prices, [priceKey(pkey, skey)]: num } })
    })

  const addProductRow = (name = '') =>
    setState(s => dirty({
      ...s,
      products: [...s.products, {
        key: newKey('p'),
        name: name || `Produto ${s.products.length + 1}`,
        quantity: 1,
      }],
    }))

  const deleteProductRow = (idx) =>
    setState(s => {
      const removed = s.products[idx]
      if (!removed) return s
      const np = { ...s.prices }
      Object.keys(np).forEach(k => { if (k.startsWith(removed.key + ':')) delete np[k] })
      return dirty({
        ...s,
        products: s.products.filter((_, i) => i !== idx),
        prices: np,
      })
    })

  const addStoreCol = () =>
    setState(s => dirty({
      ...s,
      stores: [...s.stores, {
        key: newKey('s'),
        name: `LOJA ${String.fromCharCode(65 + s.stores.length)}`,
        delivery: 0,
      }],
    }))

  const deleteStoreCol = (idx) =>
    setState(s => {
      const removed = s.stores[idx]
      if (!removed) return s
      const np = { ...s.prices }
      Object.keys(np).forEach(k => { if (k.endsWith(':' + removed.key)) delete np[k] })
      return dirty({
        ...s,
        stores: s.stores.filter((_, i) => i !== idx),
        prices: np,
      })
    })

  // ── Optimize ─────────────────────────────────────────────────────────────
  const calculate = useCallback(async (silent = false) => {
    if (!products.length || !stores.length) {
      if (!silent) toast('Adicione produtos e lojas primeiro.', 'error')
      return
    }
    const payload = {
      products: products.map(p => ({ key: p.key, quantity: Number(p.quantity) || 1 })),
      stores:   stores.map(st => ({ key: st.key, name: st.name, delivery_cost: Number(st.delivery) || 0 })),
      prices: Object.entries(prices)
        .filter(([, v]) => v !== null && v !== undefined && Number.isFinite(v))
        .map(([k, v]) => {
          const [product_key, store_key] = k.split(':')
          return { product_key, store_key, price: v }
        }),
    }
    setBusy(true)
    try {
      const data = await api.bom.optimize(payload)
      const hasAny = (data?.results || []).some(r => r.feasible)
      setState(s => ({
        ...s,
        result: hasAny ? data : null,
        // Reset selection so the freshly-computed best is shown by default.
        selectedMethod: null,
      }))
    } catch {
      if (!silent) toast('Falha ao calcular.', 'error')
    } finally {
      setBusy(false)
    }
  }, [products, stores, prices, projectId])

  // Auto-calc on edit (debounced) so the stamp stays live.
  useEffect(() => {
    if (!products.length || !stores.length) return
    const allFilled = products.every(p =>
      stores.some(st => {
        const v = prices[priceKey(p.key, st.key)]
        return v !== null && v !== undefined && Number.isFinite(v)
      })
    )
    if (!allFilled) return
    const t = setTimeout(() => calculate(true), 450)
    return () => clearTimeout(t)
  }, [calculate, products, stores, prices])

  const optimalCellSet = useMemo(() => {
    if (!activeResult?.assignments) return new Set()
    return new Set(activeResult.assignments.map(a => priceKey(a.product_key, a.store_key)))
  }, [activeResult])
  const productBestPrice = useMemo(() => {
    const m = {}
    activeResult?.assignments?.forEach(a => { m[a.product_key] = a.price })
    return m
  }, [activeResult])
  const storesUsedSet = useMemo(() => {
    if (!activeResult?.assignments) return new Set()
    return new Set(activeResult.assignments.map(a => a.store_key))
  }, [activeResult])

  // ── Per-store breakdown for the title block ──────────────────────────────
  const storeBreakdown = useMemo(() => {
    if (!activeResult?.assignments) return []
    const byKey = {}
    stores.forEach(st => { byKey[st.key] = { store: st, items: 0, sum: 0 } })
    activeResult.assignments.forEach(a => {
      if (byKey[a.store_key]) {
        byKey[a.store_key].items += 1
        byKey[a.store_key].sum   += a.price
      }
    })
    return Object.values(byKey).filter(b => b.items > 0)
      .map(b => ({
        ...b,
        delivery: Number(b.store.delivery) || 0,
        total: b.sum + (Number(b.store.delivery) || 0),
      }))
  }, [activeResult, stores])

  // ── Per-store subtotal across the visible grid (footer) ──────────────────
  const storeSubtotals = useMemo(() => {
    if (!activeResult?.assignments) return null
    const m = {}
    stores.forEach(st => { m[st.key] = 0 })
    activeResult.assignments.forEach(a => { if (m[a.store_key] != null) m[a.store_key] += a.price })
    return m
  }, [activeResult, stores])

  // ── Strategy deck rows (sorted: best first, infeasible last) ─────────────
  const strategyRows = useMemo(() => {
    if (!result?.results) return []
    const bestKey = result.best?.method
    const baseTotal = result.best?.total ?? 0
    const list = [...result.results]
    list.sort((a, b) => {
      if (a.feasible !== b.feasible) return a.feasible ? -1 : 1
      return (a.total ?? Infinity) - (b.total ?? Infinity)
    })
    return list.map(r => ({
      ...r,
      isBest: r.feasible && r.method === bestKey,
      delta:  r.feasible ? (r.total - baseTotal) : null,
    }))
  }, [result])

  // ── Excel ────────────────────────────────────────────────────────────────
  const importExcel = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
        if (!rows.length) { toast('Planilha vazia.', 'error'); return }
        const [header, ...body] = rows
        const lastIsBest = String(header[header.length - 1] || '').toLowerCase().startsWith('melhor')
        const storeCols  = header.slice(2, lastIsBest ? -1 : undefined)
        const ns = storeCols.map(name => ({ key: newKey('s'), name: String(name).trim().toUpperCase(), delivery: 0 }))
        const np = []
        const pp = {}
        body.forEach(row => {
          if (!row[0]) return
          const pkey = newKey('p')
          np.push({ key: pkey, name: String(row[0]), quantity: parseFloat(String(row[1]).replace(',', '.')) || 1 })
          ns.forEach((st, i) => {
            const num = parseFloat(String(row[2 + i] ?? '').replace(',', '.').trim())
            pp[priceKey(pkey, st.key)] = Number.isFinite(num) ? num : null
          })
        })
        setState(s => dirty({ ...s, products: np, stores: ns, prices: pp }))
        toast('Planilha importada!')
      } catch {
        toast('Falha ao ler a planilha.', 'error')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const exportExcel = () => {
    const headers = ['Produto', 'Quantidade', ...stores.map(s => s.name), 'Melhor Preço']
    const data = [headers, ...products.map(p => [
      p.name, p.quantity,
      ...stores.map(st => prices[priceKey(p.key, st.key)] ?? ''),
      productBestPrice[p.key] ?? '',
    ])]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Cotação')
    XLSX.writeFile(wb, `${state.name || 'cotacao'}.xlsx`)
  }

  const exportPlan = () => {
    if (!activeResult?.assignments?.length) { toast('Calcule primeiro.', 'error'); return }
    const pby = Object.fromEntries(products.map(p => [p.key, p]))
    const sby = Object.fromEntries(stores.map(s => [s.key, s]))
    const rows = [
      [`Estratégia: ${activeResult.label}`],
      [],
      ['Produto', 'Quantidade', 'Loja', 'Preço Unitário', 'Total'],
      ...activeResult.assignments.map(a => {
        const p = pby[a.product_key]; const st = sby[a.store_key]
        return [p?.name || '', p?.quantity || '', st?.name || '', a.price, a.price]
      }),
      ['TOTAL', '', '', '', activeResult.total],
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Plano')
    XLSX.writeFile(wb, `${state.name || 'plano'}-${activeResult.method}.xlsx`)
  }

  const copyTable = () => {
    const headers = ['Produto', 'Quantidade', ...stores.map(s => s.name), 'Melhor Preço']
    const lines = [headers.join('\t')]
    products.forEach(p => {
      const cells = [p.name, p.quantity]
      stores.forEach(st => cells.push(prices[priceKey(p.key, st.key)] ?? ''))
      cells.push(productBestPrice[p.key] ?? '')
      lines.push(cells.join('\t'))
    })
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => toast('Tabela copiada!'))
      .catch(() => toast('Não foi possível copiar.', 'error'))
  }

  // ── Save / Load ──────────────────────────────────────────────────────────
  const save = async () => {
    if (!products.length || !stores.length) { toast('Nada para salvar.', 'error'); return }
    setBusy(true)
    try {
      let counter = 1
      const negId = () => -1 * (counter++)
      const pmap = new Map()
      const smap = new Map()
      const productPayload = products.map((p, i) => {
        const id = p.dbId ?? negId()
        pmap.set(p.key, id)
        return { id, name: p.name, quantity: Number(p.quantity) || 1, position: i }
      })
      const storePayload = stores.map((s, i) => {
        const id = s.dbId ?? negId()
        smap.set(s.key, id)
        return { id, name: s.name, delivery_cost: Number(s.delivery) || 0, position: i }
      })
      const pricePayload = []
      products.forEach(p => stores.forEach(st => {
        const v = prices[priceKey(p.key, st.key)]
        if (v === null || v === undefined) return
        pricePayload.push({ product_id: pmap.get(p.key), store_id: smap.get(st.key), price: v })
      }))
      const payload = { name: state.name, products: productPayload, stores: storePayload, prices: pricePayload }
      const saved = state.quotationId
        ? await api.bom.update(state.quotationId, payload)
        : await api.bom.create(payload)
      const pp = saved.products.sort((a, b) => a.position - b.position)
      const sp = saved.stores.sort((a, b) => a.position - b.position)
      setState(s => ({
        ...s,
        quotationId: saved.id,
        name: saved.name,
        dirty: false,
        products: s.products.map((p, i) => ({ ...p, dbId: pp[i]?.id })),
        stores:   s.stores.map((st, i) => ({ ...st, dbId: sp[i]?.id })),
      }))
      refreshList()
      toast('Cotação arquivada.')
    } catch {
      toast('Falha ao salvar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const loadQuotation = async (id) => {
    setBusy(true)
    try {
      const q = await api.bom.get(id)
      const np = q.products.map(p => ({ key: newKey('p'), dbId: p.id, name: p.name, quantity: p.quantity }))
      const ns = q.stores.map(s => ({ key: newKey('s'), dbId: s.id, name: s.name, delivery: s.delivery_cost }))
      const pby = Object.fromEntries(np.map(p => [p.dbId, p.key]))
      const sby = Object.fromEntries(ns.map(s => [s.dbId, s.key]))
      const newPrices = {}
      q.prices.forEach(c => {
        const pkey = pby[c.product_id]; const skey = sby[c.store_id]
        if (pkey && skey) newPrices[priceKey(pkey, skey)] = c.price
      })
      setState({
        quotationId: q.id, name: q.name,
        products: np, stores: ns, prices: newPrices,
        result: null, dirty: false,
      })
    } catch {
      toast('Falha ao carregar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const newQuotation = () => setState(emptyState())

  const deleteQuotation = async () => {
    if (!state.quotationId) return
    if (!confirm(`Excluir "${state.name}"?`)) return
    await api.bom.delete(state.quotationId)
    refreshList()
    newQuotation()
    toast('Cotação removida.')
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('pt-BR')
  const docNum = state.quotationId
    ? `DOC-${String(state.quotationId).padStart(4, '0')}`
    : 'DOC-RASCUNHO'

  return (
    <div className="bom">
      {/* ── RAIL ─────────────────────────────────────────────────── */}
      <aside className="bom__rail">
        <div className="bom__rail-stamp">
          <span>§ ARQUIVO</span>
          <span>{quotations.length.toString().padStart(2, '0')}</span>
        </div>
        <button className="bom__rail-new" onClick={newQuotation}>
          <Plus size={12} /> Nova cotação
        </button>
        {quotations.map((q, i) => (
          <div
            key={q.id}
            className={`bom__rail-card${state.quotationId === q.id ? ' is-active' : ''}`}
            onClick={() => loadQuotation(q.id)}
          >
            <div className="bom__rail-card-num">DOC-{String(q.id).padStart(4, '0')}</div>
            <div className="bom__rail-card-name">{q.name}</div>
            <div className="bom__rail-card-meta">
              REV. {q.updated_at ? new Date(q.updated_at).toLocaleDateString('pt-BR') : '—'}
            </div>
          </div>
        ))}
        {!quotations.length && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
            letterSpacing: '0.1em', padding: '12px 4px', textAlign: 'center',
          }}>
            — nenhum arquivo —
          </div>
        )}
      </aside>

      {/* ── WORKSHEET ────────────────────────────────────────────── */}
      <main className="bom__sheet">
        <div className="bom__title-block">
          <div>
            <div className="bom__sec">§04 — Cotação · Otimizador de compras</div>
            <input
              className="bom__title-input"
              value={state.name}
              onChange={(e) => setState(s => ({ ...s, name: e.target.value, dirty: true }))}
              spellCheck={false}
            />
          </div>
          <dl className="bom__title-meta">
            <dt>DOC.</dt><dd>{docNum}</dd>
            <dt>REV.</dt><dd>{today}</dd>
            <dt>ITEM</dt><dd>{products.length.toString().padStart(2, '0')} × {stores.length.toString().padStart(2, '0')}</dd>
            <dt>STATUS</dt><dd>{state.dirty ? '◇ RASCUNHO' : '✓ ARQUIVADO'}</dd>
            <dt>EST.</dt>
            <dd>
              {activeResult ? (
                <span className="bom__title-strategy">
                  {activeResult.label}
                  {activeMethod === result?.best?.method && <em>· ÓTIMO</em>}
                </span>
              ) : '—'}
            </dd>
          </dl>
        </div>

        <div className="bom__tools">
          <button className="bom__tool" onClick={copyTable} disabled={!products.length}>
            <ClipboardCopy size={12} /> Copiar
          </button>
          <button className="bom__tool" onClick={() => fileInputRef.current?.click()}>
            <FileUp size={12} /> Importar
          </button>
          <input
            ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importExcel(f); e.target.value = '' }}
          />
          <button className="bom__tool" onClick={exportExcel} disabled={!products.length}>
            <FileSpreadsheet size={12} /> Exportar grade
          </button>
          <button className="bom__tool" onClick={exportPlan} disabled={!activeResult}>
            <FileDown size={12} /> Exportar plano
          </button>
          <span className="bom__tool-spacer" />
          {state.quotationId && (
            <button className="bom__tool bom__tool-danger" onClick={deleteQuotation}>
              <Trash2 size={12} /> Excluir
            </button>
          )}
        </div>

        {!products.length && !stores.length ? (
          <div className="bom__empty">
<pre>{`        ┌─────────┬─────────┬─────────┐
        │   ―     │   ―     │   ―     │
        ├─────────┼─────────┼─────────┤
        │   ―     │   ―     │   ―     │
        └─────────┴─────────┴─────────┘
                FOLHA EM BRANCO`}</pre>
            <div>Adicione lojas e produtos para iniciar a cotação.</div>
            <button className="bom__empty-cta" onClick={() => { addStoreCol(); addStoreCol(); addProductRow() }}>
              ▸ Iniciar nova grade
            </button>
          </div>
        ) : (
          <div className="bom__grid">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Produto</th>
                  <th style={{ width: 110 }}>Qtd.</th>
                  {stores.map((st, i) => {
                    const faded = activeResult && !storesUsedSet.has(st.key)
                    return (
                      <th key={st.key} className={`is-store${faded ? ' bom__store-faded' : ''}`}>
                        <div className="bom__store-head">
                          <input
                            className="bom__store-name"
                            value={st.name}
                            onChange={(e) => setStoreField(i, 'name', e.target.value)}
                            spellCheck={false}
                          />
                          <button className="bom__store-del" onClick={() => deleteStoreCol(i)} title="Remover loja">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </th>
                    )
                  })}
                  <th className="is-store-add" onClick={addStoreCol} title="Adicionar loja">
                    <div className="bom__store-head"><Plus size={14} /> LOJA</div>
                  </th>
                  <th style={{ width: 130, textAlign: 'right' }}>Melhor</th>
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.key}>
                    <td>
                      <div className="bom__row-handle">
                        <span className="bom__row-num">{String(i + 1).padStart(2, '0')}</span>
                        <input
                          className="bom__cell bom__cell--name"
                          value={p.name}
                          onChange={(e) => setProductField(i, 'name', e.target.value)}
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        className="bom__cell bom__cell--num"
                        type="number" min="0" step="any"
                        value={p.quantity}
                        onChange={(e) => setProductField(i, 'quantity', e.target.value)}
                      />
                    </td>
                    {stores.map(st => {
                      const k = priceKey(p.key, st.key)
                      const isOptimal = optimalCellSet.has(k)
                      const faded = activeResult && !storesUsedSet.has(st.key)
                      return (
                        <td key={st.key} style={{ padding: 0 }}>
                          <div className={`bom__cell-wrap${isOptimal ? ' is-optimal' : ''}${faded ? ' is-faded' : ''}`} style={{ padding: '8px 12px' }}>
                            <input
                              className="bom__cell bom__cell--num"
                              type="number" min="0" step="any"
                              value={prices[k] ?? ''}
                              onChange={(e) => setPriceCell(p.key, st.key, e.target.value)}
                              placeholder="—"
                            />
                          </div>
                        </td>
                      )
                    })}
                    <td className="is-store-add" />
                    <td className="bom__best">
                      {productBestPrice[p.key] !== undefined
                        ? formatBRL(productBestPrice[p.key])
                        : <span className="bom__best-empty">—</span>}
                    </td>
                    <td>
                      <button className="bom__row-del" onClick={() => deleteProductRow(i)} title="Remover produto">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="is-add-row">
                  <td colSpan={stores.length + 4} style={{ padding: 0 }}>
                    <button className="bom__add-row" onClick={() => addProductRow()}>
                      + Adicionar produto
                    </button>
                  </td>
                </tr>
              </tbody>
              {stores.length > 0 && products.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={2} className="bom__foot-label">Frete</td>
                    {stores.map((st, i) => {
                      const faded = activeResult && !storesUsedSet.has(st.key)
                      return (
                        <td key={st.key} style={{ padding: 0, opacity: faded ? 0.45 : 1 }}>
                          <input
                            className="bom__cell bom__cell--num"
                            type="number" min="0" step="any"
                            value={st.delivery}
                            onChange={(e) => setStoreField(i, 'delivery', e.target.value)}
                            style={{ padding: '8px 12px' }}
                          />
                        </td>
                      )
                    })}
                    <td className="is-store-add" />
                    <td colSpan={2} />
                  </tr>
                  {storeSubtotals && (
                    <tr className="bom__subtotal">
                      <td colSpan={2} className="bom__foot-label">Subtotal</td>
                      {stores.map(st => {
                        const sub = storeSubtotals[st.key] || 0
                        const isUsed = storesUsedSet.has(st.key)
                        const total = isUsed ? sub + (Number(st.delivery) || 0) : 0
                        return (
                          <td key={st.key} className={`bom__foot-num${total === 0 ? ' is-zero' : ''}${isUsed ? ' is-active' : ''}`}>
                            {total > 0 ? formatBRL(total) : '—'}
                          </td>
                        )
                      })}
                      <td />
                      <td className="bom__foot-num is-active" style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
                        {formatBRL(activeResult.total)}
                      </td>
                      <td />
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>
        )}
      </main>

      {/* ── SUMMARY (right title block) ──────────────────────────── */}
      <aside className="bom__summary">
        <div className={`bom__stamp${activeMethod && activeMethod !== result?.best?.method ? ' is-alt' : ''}`}>
          <div className="bom__stamp-label">
            {activeResult ? (activeMethod === result?.best?.method ? 'Custo Total Ótimo' : 'Custo · Estratégia') : 'Custo Total Ótimo'}
          </div>
          {activeResult ? (
            <>
              <div className="bom__stamp-total">{formatBRL(activeResult.total)}</div>
              <span className="bom__stamp-currency">BRL · {activeResult.assignments.length} ITENS · {activeResult.stores_used.length} LOJAS</span>
              {state.dirty && <div className="bom__stamp-stale">⚠ DADOS ALTERADOS</div>}
            </>
          ) : (
            <>
              <div className="bom__stamp-total" style={{ color: 'var(--text-dim)' }}>R$ —</div>
              <span className="bom__stamp-pending">
                {products.length && stores.length
                  ? '▸ COMPLETE A GRADE'
                  : '▸ ADICIONE PRODUTOS E LOJAS'}
              </span>
            </>
          )}
        </div>

        {strategyRows.length > 0 && (
          <div className="bom__deck">
            <div className="bom__deck-h">
              <span>§ ESTRATÉGIAS</span>
              <span>{strategyRows.filter(r => r.feasible).length}/{strategyRows.length}</span>
            </div>
            <ol className="bom__deck-list">
              {strategyRows.map((r, i) => {
                const isActive   = activeMethod === r.method
                const sign = r.delta > 0 ? '+' : ''
                return (
                  <li
                    key={r.method}
                    className={[
                      'bom__deck-card',
                      isActive ? 'is-active' : '',
                      r.isBest ? 'is-best' : '',
                      !r.feasible ? 'is-infeasible' : '',
                    ].join(' ').trim()}
                    onClick={() => r.feasible && setState(s => ({ ...s, selectedMethod: r.method }))}
                    title={r.feasible ? r.label : 'Estratégia inviável para esta grade'}
                  >
                    <div className="bom__deck-card-head">
                      <span className="bom__deck-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="bom__deck-label">{r.label}</span>
                      {r.isBest && <span className="bom__deck-badge">ÓTIMO</span>}
                      {!r.feasible && <span className="bom__deck-badge bom__deck-badge--off">INVIÁVEL</span>}
                    </div>
                    <div className="bom__deck-card-body">
                      <span className="bom__deck-total">
                        {r.feasible ? formatBRL(r.total) : '— — —'}
                      </span>
                      {r.feasible && (
                        <span className={`bom__deck-delta${r.delta > 0 ? ' is-up' : ''}`}>
                          {r.isBest
                            ? '◆ base'
                            : `${sign}${formatBRL(r.delta)}`}
                        </span>
                      )}
                    </div>
                    {r.feasible && (
                      <div className="bom__deck-card-meta">
                        {r.stores_used.length} {r.stores_used.length === 1 ? 'loja' : 'lojas'}
                        <span className="bom__deck-tick" />
                        {r.assignments.length} {r.assignments.length === 1 ? 'item' : 'itens'}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {activeResult && storeBreakdown.length > 0 && (
          <div className="bom__plan">
            <div className="bom__plan-h">
              PLANO DE COMPRA
              <span className="bom__plan-h-method">{activeResult.label}</span>
            </div>
            {storeBreakdown.map(b => (
              <div key={b.store.key} className="bom__plan-row">
                <span className="bom__plan-store">{b.store.name}</span>
                <span className="bom__plan-amount">{formatBRL(b.total)}</span>
                <span className="bom__plan-detail">
                  {b.items} {b.items === 1 ? 'item' : 'itens'} · frete {formatBRL(b.delivery)}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          className="bom__primary"
          onClick={() => calculate(false)}
          disabled={busy || !products.length || !stores.length}
        >
          <Calculator size={16} /> Calcular
        </button>

        <button
          className="bom__primary bom__primary--ghost"
          onClick={save}
          disabled={busy || !products.length}
        >
          <Save size={16} /> {state.quotationId ? 'Atualizar' : 'Arquivar'}
        </button>
      </aside>
    </div>
  )
}
