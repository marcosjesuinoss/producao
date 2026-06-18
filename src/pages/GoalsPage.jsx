import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { upsertGoal, deleteGoal, createProduct, deleteProduct } from '../api/localApi.js'
import { MONTHS, num, brl, BR_NUM_RE } from '../lib/format.js'
import { useProducts } from '../hooks/useProducts.js'

const applyMask = (v) => {
  let raw = String(v ?? '').replace(/\./g, '').replace(/[^0-9,]/g, '')
  const ci = raw.indexOf(',')
  if (ci !== -1) raw = raw.slice(0, ci + 1) + raw.slice(ci + 1).replace(/,/g, '')
  const [int = '', dec] = raw.split(',')
  const fInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec !== undefined ? `${fInt},${dec}` : fInt
}
const parseBRNum = (v) => {
  const s = String(v ?? '').trim()
  if (!s || !BR_NUM_RE.test(s)) return 0
  return Number(s.replace(/\./g, '').replace(',', '.')) || 0
}
const onDotKey = (setter) => (e) => {
  if (e.key !== '.') return
  e.preventDefault()
  const { selectionStart: s, selectionEnd: en, value } = e.target
  setter(applyMask(value.slice(0, s) + ',' + value.slice(en)))
}

export default function GoalsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [manager, setManager] = useState('')

  const [newName, setNewName] = useState('')
  const [newUseValue, setNewUseValue] = useState(true)
  const [newGoal, setNewGoal] = useState('')
  const [newMsg, setNewMsg] = useState(null)
  const [creating, setCreating] = useState(false)

  const { allProducts, custom, isValue } = useProducts()
  const customNames = useMemo(() => new Set(custom.map((p) => p.name)), [custom])
  const customById = useMemo(() => new Map(custom.map((p) => [p.name, p.id])), [custom])

  const goals = useLiveQuery(
    () => db.goals.filter((g) => g.year === Number(year) && g.month === Number(month)).toArray(),
    [year, month], []
  )
  const done = useLiveQuery(
    () => db.records.where({ year: Number(year), month: Number(month) }).toArray(),
    [year, month], []
  )

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

  const flash = (ok, text) => {
    setNewMsg({ ok, text })
    setTimeout(() => setNewMsg(null), 3500)
  }

  const handleCreateProduct = async () => {
    if (!newName.trim()) { flash(false, 'Informe o nome do produto'); return }
    setCreating(true)
    try {
      await createProduct({ name: newName, useValue: newUseValue })
      const goalVal = parseBRNum(newGoal)
      if (goalVal > 0) {
        await upsertGoal({
          year, month,
          product: newName.trim(),
          manager,
          targetQuantity: newUseValue ? 0 : goalVal,
          targetValue: newUseValue ? goalVal : null,
        })
      }
      flash(true, `"${newName.trim()}" criado!`)
      setNewName('')
      setNewGoal('')
    } catch (e) {
      flash(false, e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Metas mensais</h2>

      {/* Filtros */}
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

      {/* Criar novo produto */}
      <div className="card space-y-3">
        <h3 className="font-semibold">Novo produto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Nome *</label>
            <input className="input" placeholder="Ex: Seguro Empresarial"
              value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div>
            <label className="label">Alvo principal</label>
            <select className="input" value={newUseValue ? '1' : '0'}
              onChange={(e) => { setNewUseValue(e.target.value === '1'); setNewGoal('') }}>
              <option value="1">Valor (R$)</option>
              <option value="0">Quantidade</option>
            </select>
          </div>
          <div>
            <label className="label">
              Meta {newUseValue ? '(R$)' : '(qtd)'} — {MONTHS[Number(month) - 1]}/{year} — opcional
            </label>
            <input type="text" inputMode="decimal" className="input"
              placeholder={newUseValue ? '100.000,00' : '20'}
              value={newGoal}
              onChange={(e) => setNewGoal(applyMask(e.target.value))}
              onKeyDown={onDotKey(setNewGoal)} />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn btn-brand" onClick={handleCreateProduct} disabled={creating}>
            {creating ? 'Criando…' : '+ Criar produto'}
          </button>
          {newMsg && (
            <span className="text-sm" style={{ color: newMsg.ok ? 'var(--c-good)' : 'var(--c-bad)' }}>
              {newMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Tabela */}
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
            {allProducts.map((product) => {
              const g = goalFor(product)
              const isVal = isValue(product)
              const rec = realizedByProduct[product] || { quantity: 0, value: 0 }
              const realized = isVal ? rec.value : rec.quantity
              const target = isVal ? (g?.targetValue || 0) : (g?.targetQuantity || 0)
              const pct = target > 0 ? Math.round((realized / target) * 100) : null
              const isCustom = customNames.has(product)
              return (
                <GoalRow key={product} product={product} goal={g} isValueProduct={isVal}
                  realized={realized} pct={pct} isCustom={isCustom}
                  onSave={save}
                  onDelete={isCustom ? () => deleteProduct(customById.get(product)) : null} />
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        % = realizado ÷ meta. Produtos marcados como "custom" foram criados neste app.
      </p>
    </section>
  )
}

function GoalRow({ product, goal, isValueProduct, realized, pct, isCustom, onSave, onDelete }) {
  const [qty, setQty] = useState(goal?.targetQuantity ?? '')
  const [val, setVal] = useState(goal?.targetValue ?? '')

  if (goal && qty === '' && goal.targetQuantity) setQty(goal.targetQuantity)
  if (goal && val === '' && goal.targetValue) setVal(goal.targetValue)

  const color = pct == null ? 'var(--c-muted)' : pct >= 100 ? 'var(--c-good)' : pct >= 60 ? 'var(--c-warn)' : 'var(--c-bad)'

  return (
    <tr className="border-t" style={{ borderColor: 'var(--c-border)' }}>
      <td className="p-3 font-medium">
        {product}
        {isCustom && (
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--c-border)', color: 'var(--c-muted)' }}>
            custom
          </span>
        )}
      </td>
      <td className="p-3 text-right">
        {isValueProduct ? (
          <input type="number" min="0" step="0.01" className="input w-32 text-right" value={val}
            onChange={(e) => setVal(e.target.value)} aria-label={`Meta de valor para ${product}`} />
        ) : (
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
        <div className="flex gap-1 justify-end">
          <button className="btn btn-brand px-2 py-1 text-xs"
            onClick={() => onSave(product, isValueProduct ? 0 : qty, val)}>
            Salvar
          </button>
          {onDelete && (
            <button className="btn px-2 py-1 text-xs" style={{ color: 'var(--c-bad)' }}
              title="Excluir produto customizado"
              onClick={() => window.confirm(`Excluir produto "${product}"?`) && onDelete()}>
              ×
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
