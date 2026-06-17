import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { upsertGoal, deleteGoal } from '../api/localApi.js'
import { PRODUCTS, MONTHS, VALUE_PRODUCTS, num, brl } from '../lib/format.js'

export default function GoalsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [manager, setManager] = useState('')

  const goals = useLiveQuery(
    () => db.goals.filter((g) => g.year === Number(year) && g.month === Number(month)).toArray(),
    [year, month], []
  )
  const done = useLiveQuery(
    () => db.records.where({ year: Number(year), month: Number(month) }).toArray(),
    [year, month], []
  )

  // agrega quantidade E valor por produto
  const realizedByProduct = useMemo(() => {
    const map = {}
    for (const r of done) {
      map[r.product] = map[r.product] || { quantity: 0, value: 0 }
      map[r.product].quantity += r.quantity || 0
      map[r.product].value += r.value || 0
    }
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
          <input id="g-year" type="number" className="input" value={year}
            onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="g-month">Mês</label>
          <select id="g-month" className="input" value={month}
            onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="g-manager">Gerente (opcional)</label>
          <input id="g-manager" className="input" value={manager}
            onChange={(e) => setManager(e.target.value)} placeholder="Todos" />
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: 'var(--c-muted)' }}>
              <th className="p-3">Produto</th>
              <th className="p-3 text-right">Meta</th>
              <th className="p-3 text-right">Realizado</th>
              <th className="p-3 text-right">%</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((product) => {
              const g = goalFor(product)
              const isVal = VALUE_PRODUCTS.has(product)
              const rec = realizedByProduct[product] || { quantity: 0, value: 0 }
              const realized = isVal ? rec.value : rec.quantity
              const target = isVal ? (g?.targetValue || 0) : (g?.targetQuantity || 0)
              const pct = target > 0 ? Math.round((realized / target) * 100) : null
              return (
                <GoalRow key={product} product={product} goal={g} isValueProduct={isVal}
                  realized={realized} pct={pct}
                  onSave={save} onDelete={() => g && deleteGoal(g.id)} />
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        % = realizado ÷ meta. Crédito Pessoal usa valor (R$) como métrica.
      </p>
    </section>
  )
}

function GoalRow({ product, goal, isValueProduct, realized, pct, onSave }) {
  const [qty, setQty] = useState(goal?.targetQuantity ?? '')
  const [val, setVal] = useState(goal?.targetValue ?? '')

  if (goal && qty === '' && goal.targetQuantity) setQty(goal.targetQuantity)
  if (goal && val === '' && goal.targetValue) setVal(goal.targetValue)

  const color = pct == null ? 'var(--c-muted)' : pct >= 100 ? 'var(--c-good)' : pct >= 60 ? 'var(--c-warn)' : 'var(--c-bad)'

  return (
    <tr className="border-t" style={{ borderColor: 'var(--c-border)' }}>
      <td className="p-3 font-medium">{product}</td>
      <td className="p-3 text-right">
        {isValueProduct ? (
          /* Crédito Pessoal: apenas meta em R$ */
          <input type="number" min="0" step="0.01" className="input w-32 text-right" value={val}
            onChange={(e) => setVal(e.target.value)} aria-label={`Meta de valor para ${product}`} />
        ) : (
          /* demais produtos: meta em unidades (+ campo de valor oculto mas salvo) */
          <div className="flex flex-col items-end gap-1">
            <input type="number" min="0" className="input w-24 text-right" value={qty}
              onChange={(e) => setQty(e.target.value)} aria-label={`Meta de quantidade para ${product}`} />
            <input type="number" min="0" step="0.01" className="input w-28 text-right text-xs"
              value={val} placeholder="R$ opcional"
              onChange={(e) => setVal(e.target.value)} aria-label={`Meta de valor para ${product}`} />
          </div>
        )}
      </td>
      <td className="p-3 text-right font-medium">
        {isValueProduct ? brl(realized) : num(realized)}
      </td>
      <td className="p-3 text-right font-semibold" style={{ color }}>
        {pct == null ? '—' : pct + '%'}
      </td>
      <td className="p-3 text-right">
        <button className="btn btn-brand px-2 py-1"
          onClick={() => onSave(product, isValueProduct ? 0 : qty, val)}>
          Salvar
        </button>
      </td>
    </tr>
  )
}
