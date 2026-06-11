import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { upsertGoal, deleteGoal } from '../api/localApi.js'
import { PRODUCTS, MONTHS, num } from '../lib/format.js'

// Tela de metas — define meta mensal por produto e gerente.
export default function GoalsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [manager, setManager] = useState('')

  const goals = useLiveQuery(
    () => db.goals.filter((g) => g.year === Number(year) && g.month === Number(month)).toArray(),
    [year, month],
    []
  )
  // realizado do periodo, por produto, para mostrar "meta realizada"
  const done = useLiveQuery(
    () => db.records.where({ year: Number(year), month: Number(month) }).toArray(),
    [year, month],
    []
  )

  const realizedByProduct = useMemo(() => {
    const map = {}
    for (const r of done) map[r.product] = (map[r.product] || 0) + (r.quantity || 0)
    return map
  }, [done])

  const goalFor = (product) => goals.find((g) => g.product === product)

  const save = async (product, targetQuantity, targetValue) => {
    await upsertGoal({ year, month, product, manager, targetQuantity, targetValue })
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Metas mensais</h2>

      <div className="card grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="g-year">Ano</label>
          <input id="g-year" type="number" className="input" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="g-month">Mes</label>
          <select id="g-month" className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="g-manager">Gerente (opcional)</label>
          <input id="g-manager" className="input" value={manager} onChange={(e) => setManager(e.target.value)} placeholder="Todos" />
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: 'var(--c-muted)' }}>
              <th className="p-3">Produto</th>
              <th className="p-3 text-right">Meta (un)</th>
              <th className="p-3 text-right">Meta (R$)</th>
              <th className="p-3 text-right">Realizado</th>
              <th className="p-3 text-right">%</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((product) => {
              const g = goalFor(product)
              const realized = realizedByProduct[product] || 0
              const pct = g?.targetQuantity ? Math.round((realized / g.targetQuantity) * 100) : null
              return (
                <GoalRow key={product} product={product} goal={g} realized={realized} pct={pct}
                  onSave={save} onDelete={() => g && deleteGoal(g.id)} />
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">A coluna "%" e a meta realizada calculada automaticamente (realizado ÷ meta).</p>
    </section>
  )
}

function GoalRow({ product, goal, realized, pct, onSave }) {
  const [qty, setQty] = useState(goal?.targetQuantity ?? '')
  const [val, setVal] = useState(goal?.targetValue ?? '')
  // mantem sincronizado quando muda o mes/ano
  if (goal && qty === '' && goal.targetQuantity) setQty(goal.targetQuantity)

  const color = pct == null ? 'var(--c-muted)' : pct >= 100 ? 'var(--c-good)' : pct >= 60 ? 'var(--c-warn)' : 'var(--c-bad)'

  return (
    <tr className="border-t" style={{ borderColor: 'var(--c-border)' }}>
      <td className="p-3 font-medium">{product}</td>
      <td className="p-3 text-right">
        <input type="number" min="0" className="input w-24 text-right" value={qty}
          onChange={(e) => setQty(e.target.value)} aria-label={`Meta de quantidade para ${product}`} />
      </td>
      <td className="p-3 text-right">
        <input type="number" min="0" step="0.01" className="input w-28 text-right" value={val}
          onChange={(e) => setVal(e.target.value)} aria-label={`Meta de valor para ${product}`} />
      </td>
      <td className="p-3 text-right">{num(realized)}</td>
      <td className="p-3 text-right font-semibold" style={{ color }}>{pct == null ? '—' : pct + '%'}</td>
      <td className="p-3 text-right">
        <button className="btn btn-brand px-2 py-1" onClick={() => onSave(product, qty, val)}>Salvar</button>
      </td>
    </tr>
  )
}
