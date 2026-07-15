import { useState } from 'react'
import { ArrowUpDown, X } from 'lucide-react'
import { useProducts } from '../hooks/useProducts.js'

const SORT_LABELS = {
  date: 'Data (padrão)',
  'value-desc': 'Valor: maior → menor',
  'value-asc': 'Valor: menor → maior',
}

const SORT_SHORT_LABELS = {
  date: 'Data',
  'value-desc': 'Valor ↓',
  'value-asc': 'Valor ↑',
}

function SortMenu({ sortMode, onSortChange }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        className="input filter-ctl flex items-center justify-between gap-1"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ordenar registros"
        aria-haspopup="menu"
        aria-expanded={open}
        style={sortMode !== 'date' ? { color: 'var(--c-brand)' } : {}}
      >
        <span className="truncate">{SORT_SHORT_LABELS[sortMode]}</span>
        <ArrowUpDown size={14} className="shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-20 p-1 shadow-lg"
            style={{
              background: 'var(--c-surface)',
              border: '1px solid var(--input-border)',
              borderRadius: '12px',
              minWidth: '200px',
            }}
          >
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <button
                key={key}
                role="menuitem"
                className="w-full text-left px-3 py-2 rounded-lg text-sm"
                style={{ color: sortMode === key ? 'var(--c-brand)' : 'var(--text-secondary)', fontWeight: sortMode === key ? 600 : 400 }}
                onClick={() => { onSortChange(key); setOpen(false) }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Filters({ value, onChange, accounts = [], sortMode = 'date', onSortChange }) {
  const { allProducts } = useProducts()
  const set = (k, v) => onChange({ ...value, [k]: v })
  const hasFilters = value.date || value.product || value.account

  return (
    <div className="card space-y-3">
      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>Filtros</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="f-date">Data</label>
          <input
            id="f-date"
            type="date"
            className="input filter-ctl"
            value={value.date || ''}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>
        {onSortChange && (
          <div>
            <label className="label">Ordenar</label>
            <SortMenu sortMode={sortMode} onSortChange={onSortChange} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="f-product">Produto</label>
          <select id="f-product" className="input filter-ctl" value={value.product || ''} onChange={(e) => set('product', e.target.value)}>
            <option value="">Todos</option>
            {allProducts.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-account">Conta</label>
          <select id="f-account" className="input filter-ctl" value={value.account || ''} onChange={(e) => set('account', e.target.value)}>
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
