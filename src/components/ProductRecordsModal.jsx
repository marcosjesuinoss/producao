import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, X } from 'lucide-react'
import { db } from '../db/db.js'
import { dateBR, brl, num } from '../lib/format.js'
import { exportProductRecordsPdf } from '../lib/pdf.js'
import { useProducts } from '../hooks/useProducts.js'
import ConfirmDialog from './ConfirmDialog.jsx'

// Popup de detalhamento: lista os registros individuais de UM produto dentro
// do periodo (Resumo = mes atual; Acumulado = semestre/ano selecionado).
// Cabecalho no mesmo estilo do popup de "Novo registro" (RecordModal.jsx).
export default function ProductRecordsModal({ product, year, startMonth, endMonth, periodLabel, onClose }) {
  const { isValue } = useProducts()
  const [records, setRecords] = useState(null) // null = carregando
  const [showPdfWarning, setShowPdfWarning] = useState(false)

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

  const handleDownloadPdf = () => {
    setShowPdfWarning(false)
    if (!records?.length) return
    exportProductRecordsPdf({ product, records, isValue: isVal, total, startMonth, endMonth, year, periodLabel })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="modal-backdrop absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="modal-sheet relative w-full sm:max-w-lg flex flex-col"
        style={{ background: 'var(--c-surface)', borderRadius: '24px', maxHeight: 'min(85vh, 100%)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
      >

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
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {records?.length > 0 && (
                <button
                  onClick={() => setShowPdfWarning(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--bg-card-deep)', color: 'var(--text-muted)' }}
                  aria-label="Baixar PDF"
                >
                  <Download size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-card-deep)', color: 'var(--text-muted)' }}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
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
              <ul>
                {records.map((r, i) => (
                  <li
                    key={r.id}
                    className="py-3 flex items-center gap-3"
                    style={{ borderBottom: i < records.length - 1 ? '1px solid var(--c-border)' : 'none' }}
                  >
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

      {showPdfWarning && (
        <ConfirmDialog
          title="Baixar PDF"
          description={`Você está baixando o detalhamento de ${product} em PDF.`}
          confirmLabel="Baixar"
          confirmIcon={Download}
          tone="warning"
          onConfirm={handleDownloadPdf}
          onCancel={() => setShowPdfWarning(false)}
        />
      )}
    </div>,
    document.body
  )
}
