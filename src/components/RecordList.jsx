import { useState } from 'react'
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
    return <div className="card text-center text-muted py-8">Nenhum registro para os filtros atuais.</div>
  }

  return (
    <div className="card p-0 overflow-hidden">
      <ul className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
        {records.map((r) => (
          <li key={r.id} className="relative flex items-center gap-3 p-3"
            style={{ borderColor: 'var(--c-border)' }}>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-medium truncate">
                {r.product}
                {/* ✓ sutil para conta qualificada */}
                {r.qualified && (
                  <span className="text-xs font-bold shrink-0"
                    style={{ color: 'var(--c-good)' }} title="Conta qualificada">✓</span>
                )}
              </div>
              <div className="text-xs text-muted truncate">
                {shortDate(r.date)}
                {r.account ? ` · ${r.account}` : ''}
                {/* valor só aparece na linha de detalhe se NÃO for o campo principal */}
                {!isValue(r.product) && r.value != null ? ` · ${brl(r.value)}` : ''}
              </div>
            </div>

            <div className="text-right shrink-0">
              {isValue(r.product)
                ? <>
                    <div className="text-base font-bold leading-none">{brl(r.value)}</div>
                    <div className="text-[10px] text-muted">valor</div>
                  </>
                : <>
                    <div className="text-lg font-bold leading-none">{num(r.quantity)}</div>
                    <div className="text-[10px] text-muted">qtd</div>
                  </>
              }
            </div>

            <button className="btn px-2 py-1 shrink-0" aria-haspopup="menu"
              aria-expanded={openId === r.id}
              aria-label={`Ações de ${r.product}`}
              onClick={() => setOpenId(openId === r.id ? null : r.id)}>
              ⋯
            </button>

            {openId === r.id && (
              <>
                <button className="fixed inset-0 z-10 cursor-default" aria-hidden tabIndex={-1}
                  onClick={() => setOpenId(null)} />
                <div role="menu"
                  className="absolute right-3 top-12 z-20 card p-1 shadow-lg min-w-[140px]">
                  <button role="menuitem"
                    className="w-full text-left px-3 py-2 rounded-lg hover:opacity-80"
                    onClick={() => { setOpenId(null); onEdit(r) }}>✏️ Editar</button>
                  <button role="menuitem"
                    className="w-full text-left px-3 py-2 rounded-lg hover:opacity-80"
                    style={{ color: 'var(--c-bad)' }}
                    onClick={() => { setOpenId(null); onDelete(r) }}>🗑️ Excluir</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
