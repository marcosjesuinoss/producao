import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { dateBR, brl, num } from '../lib/format.js'

const toggleBtnStyle = (active) => ({
  flex: 1,
  border: active ? '1px solid #818cf8' : '1px solid var(--input-border)',
  background: active ? 'rgba(99,102,241,0.1)' : 'var(--bg-card-deep)',
  color: active ? '#818cf8' : 'var(--text-secondary)',
})

const describeMatch = (r) => {
  const parts = [dateBR(r.date)]
  if (r.account) parts.push(`conta ${r.account}`)
  parts.push(r.value != null && r.value > 0 ? brl(r.value) : `qtd ${num(r.quantity)}`)
  return parts.join(' · ')
}

// matches: [{ incoming, existing }] vindos de findContentDuplicates — registros
// com id novo mas mesma data/conta/produto/valor de um registro ja existente.
// onConfirm recebe o Set de ids (do arquivo importado) que o usuario decidiu
// pular; por padrao todos ficam marcados como "pular" (mais seguro).
export default function DuplicateReview({ matches, onConfirm, onCancel }) {
  const [toImport, setToImport] = useState(() => new Set())

  const handleConfirm = () => {
    const skipIds = new Set(matches.map((m) => m.incoming.id).filter((id) => !toImport.has(id)))
    onConfirm(skipIds)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
        aria-hidden
      />

      <div
        className="relative w-full sm:max-w-md flex flex-col"
        style={{ background: 'var(--c-surface)', borderRadius: '24px 24px 0 0', maxHeight: '92dvh' }}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--input-border)' }} />
        </div>

        <div className="px-5 pt-2 pb-1 shrink-0 flex items-start gap-3">
          <div style={{ background: 'rgba(234,179,8,0.12)', borderRadius: '10px', padding: '8px', flexShrink: 0 }}>
            <AlertTriangle size={20} style={{ color: 'var(--accent-yellow)' }} />
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {matches.length} possível{matches.length > 1 ? 'is' : ''} duplicata{matches.length > 1 ? 's' : ''}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Já existe um registro com a mesma data, conta, produto e valor. Escolha o que fazer com cada um.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-3 space-y-2">
          {matches.map(({ incoming }) => {
            const willImport = toImport.has(incoming.id)
            return (
              <div
                key={incoming.id}
                className="p-3"
                style={{ background: 'var(--bg-card-deep)', borderRadius: '12px', border: '1px solid var(--c-border)' }}
              >
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {incoming.product}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {describeMatch(incoming)}
                </p>
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    className="btn text-xs px-2.5 py-1"
                    style={toggleBtnStyle(!willImport)}
                    onClick={() => setToImport((prev) => { const n = new Set(prev); n.delete(incoming.id); return n })}
                  >
                    Pular
                  </button>
                  <button
                    type="button"
                    className="btn text-xs px-2.5 py-1"
                    style={toggleBtnStyle(willImport)}
                    onClick={() => setToImport((prev) => new Set(prev).add(incoming.id))}
                  >
                    Importar mesmo assim
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-5 pb-6 pt-3 shrink-0 flex gap-2">
          <button className="btn flex-1" onClick={onCancel}>Cancelar importação</button>
          <button className="btn btn-brand flex-1" onClick={handleConfirm}>Continuar</button>
        </div>
      </div>
    </div>
  )
}
