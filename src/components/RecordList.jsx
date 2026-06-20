import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { brl, num } from '../lib/format.js'
import { useProducts } from '../hooks/useProducts.js'

const shortDate = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function RecordList({ records, onEdit, onDelete }) {
  const { isValue } = useProducts()
  const [openId, setOpenId] = useState(null)

  if (!records?.length) {
    return (
      <div className="card text-center py-8" style={{ color: 'var(--text-muted)' }}>
        Nenhum registro para os filtros atuais.
      </div>
    )
  }

  return (
    <div className="card p-0">
      <ul className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
        {records.map((r) => (
          <li
            key={r.id}
            className="relative flex items-center gap-3 p-3"
            style={{ borderColor: 'var(--c-border)' }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {r.product}
                {r.qualified && (
                  <span className="text-xs font-bold shrink-0" style={{ color: 'var(--c-good)' }} title="Conta qualificada">
                    ✓
                  </span>
                )}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {shortDate(r.date)}
                {r.account ? ` · ${r.account}` : ''}
                {!isValue(r.product) && r.value != null ? ` · ${brl(r.value)}` : ''}
              </div>
            </div>

            <div className="text-right shrink-0">
              {isValue(r.product) ? (
                <>
                  <div className="text-base font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                    {brl(r.value)}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>valor</div>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                    {num(r.quantity)}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>qtd</div>
                </>
              )}
            </div>

            <button
              className="btn px-2 py-1.5 shrink-0"
              aria-haspopup="menu"
              aria-expanded={openId === r.id}
              aria-label={`Ações de ${r.product}`}
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
            >
              <MoreHorizontal size={16} />
            </button>

            {openId === r.id && (
              <>
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setOpenId(null)}
                />
                <div
                  role="menu"
                  className="absolute right-3 bottom-full mb-1 z-20 p-1 shadow-lg"
                  style={{
                    background: 'var(--c-surface)',
                    border: '1px solid var(--input-border)',
                    borderRadius: '12px',
                    minWidth: '140px',
                  }}
                >
                  <button
                    role="menuitem"
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => { setOpenId(null); onEdit(r) }}
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                  <button
                    role="menuitem"
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                    style={{ color: 'var(--accent-red)' }}
                    onClick={() => { setOpenId(null); onDelete(r) }}
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
