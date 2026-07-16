import { Fragment, useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, RotateCcw, X } from 'lucide-react'
import { brl, num, MONTHS } from '../lib/format.js'
import { useProducts } from '../hooks/useProducts.js'

const ABERTURA = 'Abertura de Conta'

const shortDate = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// "14 Jul 2026" — dia + mes abreviado (3 letras) + ano, pt-BR.
const pillDate = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
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

function IgnoreConfirmDialog({ record, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
        aria-hidden
      />
      <div
        className="relative w-full max-w-xs space-y-4 p-5"
        style={{ background: 'var(--c-surface)', borderRadius: '20px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
      >
        <div>
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Ignorar esta produção?</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            O registro continua salvo mas será marcado como ignorado.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn flex-1" onClick={onCancel}>Não</button>
          <button className="btn btn-brand flex-1" onClick={onConfirm}>Sim</button>
        </div>
      </div>
    </div>
  )
}

export default function RecordList({ records, onEdit, onDelete, onIgnore, groupByDate = false }) {
  const { isValue } = useProducts()
  const [openId, setOpenId] = useState(null)
  const [detailRecord, setDetailRecord] = useState(null)
  const [ignoreTarget, setIgnoreTarget] = useState(null)

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
        {/* Sem divide-y de proposito: a borda entre itens e controlada
            manualmente pra que NENHUMA borda toque o separador de data
            (evita a linha branca que sobrava acima da pilula). */}
        <ul>
          {records.map((r, idx) => {
            const showDateHeader = groupByDate && (idx === 0 || records[idx - 1].date !== r.date)
            return (
            <Fragment key={r.id}>
            {showDateHeader && (
              <li
                aria-hidden
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 14px 8px',
                  marginTop: idx === 0 ? 0 : '4px',
                }}
              >
                <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.5))' }} />
                <span
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    color: '#818cf8',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '99px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pillDate(r.date)}
                </span>
                <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(6,182,212,0.5), transparent)' }} />
              </li>
            )}
            <li
              className="relative flex items-center gap-3 p-3"
              style={{
                // borda superior so entre itens do MESMO grupo; o primeiro
                // item (idx 0) e todo item logo apos um separador nao levam
                // borda — a transicao ali e marcada so pela pilula.
                borderTop: (idx === 0 || showDateHeader) ? 'none' : '1px solid var(--c-border)',
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium flex items-baseline gap-2 min-w-0">
                  <span className="truncate" style={{ color: r.ignored ? 'var(--text-faint)' : 'var(--text-primary)' }}>{r.product}</span>
                  {r.ignored ? (
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-faint)' }}>⊘ ignorada</span>
                  ) : r.product === ABERTURA ? (
                    <span className="text-xs shrink-0" style={{ color: r.qualified ? 'var(--c-good)' : 'var(--accent-red)' }}>
                      {r.qualified ? '✓ qualificada' : '✗ não qualificada'}
                    </span>
                  ) : null}
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
                    {r.ignored ? (
                      <button
                        role="menuitem"
                        className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                        onClick={() => { setOpenId(null); onIgnore(r, false) }}
                      >
                        <RotateCcw size={14} />
                        Retomar produção
                      </button>
                    ) : (
                      <button
                        role="menuitem"
                        className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                        onClick={() => { setOpenId(null); setIgnoreTarget(r) }}
                      >
                        <EyeOff size={14} />
                        Ignorar produção
                      </button>
                    )}
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
            </Fragment>
            )
          })}
        </ul>
      </div>

      {ignoreTarget && (
        <IgnoreConfirmDialog
          record={ignoreTarget}
          onConfirm={() => { onIgnore(ignoreTarget, true); setIgnoreTarget(null) }}
          onCancel={() => setIgnoreTarget(null)}
        />
      )}

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
