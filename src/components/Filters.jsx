import { MONTHS } from '../lib/format.js'
import { useProducts } from '../hooks/useProducts.js'

export default function Filters({ value, onChange, accounts = [] }) {
  const { allProducts } = useProducts()
  const set = (k, v) => onChange({ ...value, [k]: v })
  const years = []
  const cy = new Date().getFullYear()
  for (let y = cy - 3; y <= cy + 1; y++) years.push(y)

  return (
    <div className="card grid grid-cols-2 md:grid-cols-4 gap-3">
      <div>
        <label className="label" htmlFor="f-year">Ano</label>
        <select id="f-year" className="input" value={value.year || ''} onChange={(e) => set('year', e.target.value)}>
          <option value="">Todos</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-month">Mes</label>
        <select id="f-month" className="input" value={value.month || ''} onChange={(e) => set('month', e.target.value)}>
          <option value="">Todos</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-product">Produto</label>
        <select id="f-product" className="input" value={value.product || ''} onChange={(e) => set('product', e.target.value)}>
          <option value="">Todos</option>
          {allProducts.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-account">Conta</label>
        <select id="f-account" className="input" value={value.account || ''} onChange={(e) => set('account', e.target.value)}>
          <option value="">Todas</option>
          {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>
  )
}
