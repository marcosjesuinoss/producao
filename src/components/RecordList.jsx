import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, Eye, X } from 'lucide-react'
import { brl, num } from '../lib/format.js'
import { useProducts } from '../hooks/useProducts.js'

const ABERTURA = 'Abertura de Conta'

const shortDate = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

const fullDate = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function RecordDetailsModal({ record, isValueProd, onClose }) {
  const rows = [
    { label: 'Produto',   value: record.product },
    { label: 'Data',      value: fullDate(record.date) },
    { label: 'Conta',     value: record.account || '—' },
    record.clientName?.trim()
      ? { label: 'Cliente', value: record.clientName.trim() }
      : null,
    isValueProd
      ? { label: 'Valor',     value: brl(record.value) }
      : { label: 'Quantidade', value: num(record.quantity) },
    !isValueProd && record.value != null && record.value > 0
      ? { label: 'Valor (R$)', value: brl(record.value) }
      : null,
    record.qualified
      ? { label: 'Qualificada', value: 'Sim' }
      : null,
    record.manager
      ? { label: 'Gerente', value: record.manager }
      : null,
    record.notes?.trim()
      ? { label: 'Observações', value: record.notes.trim() }
      : null,
  ].filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="modal-sheet relative w-full sm:max-w-md flex flex-col"
        style={{ background: 'var(--c-surface)', borderRadius: '24px 24px 0 0', maxHeight: '85dvh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--input-border)' }} />
        </div>

        {/* Cabeçalho */}
        <div className="px-5 pt-2 pb-3 shrink-0 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--c-brand)' }}>
              Registro
            </p>
            <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {record.product}
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

        <div className="h-0.5 mx-5 rounded-full shrink-0" style={{ background: 'linear-gradient(90deg, var(--c-brand), transparent)' }} />

        {/* Linhas de detalhe */}
        <div className="overflow-y-auto px-5 py-4 space-y-0">
          {rows.map(({ label, value }) => (
            <div
              key={label}
              className="flex justify-between gap-4 py-2.5"
              style={{ borderBottom: '1px solid var(--c-border)' }}
            >
              <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="text-sm font-medium text-right" style={{ color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>

        <div className="px-5 pb-6 pt-3 shrink-0">
          <button className="btn w-full" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

export default function RecordList({ records, onEdit, onDelete }) {
  const { isValue } = useProducts()
  const [openId, setOpenId] = useState(null)
  const [detailRecord, setDetailRecord] = useState(null)

  if (!records?.length) {
    return (
      <div className="card text-center py-8" style={{ color: 'var(--text-muted)' }}>
        Nenhum registro para os filtros atuais.
      </div>
    )
  }

  return (
    <>
      <div className="card p-0">
        <ul className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
          {records.map((r) => (
            <li
              key={r.id}
              className="relative flex items-center gap-3 p-3"
              style={{ borderColor: 'var(--c-border)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium flex items-baseline gap-2 min-w-0">
                  <span className="truncate" style={{ color: 'var(--text-primary)' }}>{r.product}</span>
                  {r.product === ABERTURA && (
                    <span className="text-xs shrink-0" style={{ color: r.qualified ? 'var(--c-good)' : 'var(--accent-red)' }}>
                      {r.qualified ? '✓ qualificada' : '✗ não qualificada'}
                    </span>
                  )}
                </div>
                {r.clientName?.trim() && (
                  <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {r.clientName.trim()}
                  </div>
                )}
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {shortDate(r.date)}
                  {r.account ? ` · conta: ${r.account}` : ''}
                  {!isValue(r.product) && r.value != null ? ` · ${brl(r.value)}` : ''}
                </div>
                {r.notes?.trim() && (
                  <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-faint)' }}>
                    {r.notes.trim()}
                  </div>
                )}
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
                      minWidth: '160px',
                    }}
                  >
                    <button
                      role="menuitem"
                      className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => { setOpenId(null); setDetailRecord(r) }}
                    >
                      <Eye size={14} />
                      Ver detalhes
                    </button>
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

      {detailRecord && (
        <RecordDetailsModal
          record={detailRecord}
          isValueProd={isValue(detailRecord.product)}
          onClose={() => setDetailRecord(null)}
        />
      )}
    </>
  )
}
