import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { db } from '../db/db.js'
import { dateBR, brl, num } from '../lib/format.js'
import { useProducts } from '../hooks/useProducts.js'

// Popup de detalhamento: lista os registros individuais de UM produto dentro
// do periodo (Resumo = mes atual; Acumulado = semestre/ano selecionado).
// Cabecalho no mesmo estilo do popup de "Novo registro" (RecordModal.jsx).
export default function ProductRecordsModal({ product, year, startMonth, endMonth, onClose }) {
  const { isValue } = useProducts()
  const [records, setRecords] = useState(null) // null = carregando

  useEffect(() => {
    let alive = true
    db.records
      .where('year').equals(Number(year))
      .and((r) => r.month >= startMonth && r.month <= endMonth && r.product === product)
      .toArray()
      .then((rows) => {
        if (alive) setRecords(rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)))
      })
    return () => { alive = false }
  }, [product, year, startMonth, endMonth])

  const isVal = isValue(product)
  const total = (records ?? []).reduce((s, r) => s + (isVal ? (r.value || 0) : (r.quantity || 0)), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="modal-backdrop absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="modal-sheet relative w-full sm:max-w-lg flex flex-col"
        style={{ background: 'var(--c-surface)', borderRadius: '24px 24px 0 0', maxHeight: '85dvh' }}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--input-border)' }} />
        </div>

        <div className="px-5 pt-2 pb-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--c-brand)' }}>
                Detalhamento
              </p>
              <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {product}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-card-deep)', color: 'var(--text-muted)' }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="mt-3 h-0.5 rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--c-brand), transparent)' }}
          />
        </div>

        <div className="overflow-y-auto px-5 pb-6 flex-1">
          {records === null ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Carregando…</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Nenhum registro nesse período.</p>
          ) : (
            <>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                {records.length} registro{records.length === 1 ? '' : 's'} · total {isVal ? brl(total) : num(total)}
              </p>
              <ul className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
                {records.map((r) => (
                  <li key={r.id} className="py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {dateBR(r.date)}
                        {r.account ? ` · conta: ${r.account}` : ''}
                        {!isVal && r.value != null && r.value > 0 ? ` · ${brl(r.value)}` : ''}
                      </div>
                      {r.notes?.trim() && (
                        <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-faint)' }}>
                          {r.notes.trim()}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {isVal ? (
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
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
