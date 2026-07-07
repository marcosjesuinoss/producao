import { X } from 'lucide-react'
import { useProducts } from '../hooks/useProducts.js'

export default function Filters({ value, onChange, accounts = [] }) {
  const { allProducts } = useProducts()
  const set = (k, v) => onChange({ ...value, [k]: v })
  const hasFilters = value.date || value.product || value.account

  return (
    <div className="card space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="f-date">Data</label>
          <input
            id="f-date"
            type="date"
            className="input !w-fit max-w-full"
            value={value.date || ''}
            onChange={(e) => set('date', e.target.value)}
          />
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

      {hasFilters && (
        <button
          className="btn text-xs flex items-center gap-1"
          style={{ color: 'var(--text-muted)' }}
          onClick={() => onChange({})}
        >
          <X size={12} />
          Limpar filtros
        </button>
      )}
    </div>
  )
}
