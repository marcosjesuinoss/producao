import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { productBreakdown } from '../lib/summaries.js'
import { MONTHS, num, brl, VALUE_PRODUCTS } from '../lib/format.js'

const pctColor = (p) =>
  p == null ? 'var(--c-muted)' : p >= 100 ? 'var(--c-good)' : p >= 60 ? 'var(--c-warn)' : 'var(--c-bad)'

export default function HomePage() {
  const now = new Date()
  const [breakdown, setBreakdown] = useState([])

  const tick = useLiveQuery(
    async () => (await db.records.count()) + (await db.goals.count()), [], 0
  )

  useEffect(() => {
    let alive = true
    productBreakdown().then((data) => {
      if (alive) setBreakdown(data)
    })
    return () => { alive = false }
  }, [tick])

  // apenas produtos com produção registrada (realized > 0)
  const active = breakdown.filter((b) => b.realized > 0)

  // totalizador: exclui VALUE_PRODUCTS do total de quantidade (métricas incomparáveis)
  const totalQty = active.filter((b) => !b.useValue).reduce((s, b) => s + b.quantity, 0)
  const totalTarget = breakdown.filter((b) => !b.useValue).reduce((s, b) => s + b.targetQty, 0)
  const totalValue = active.reduce((s, b) => s + b.value, 0)
  const totalPct = totalTarget > 0 ? Math.round((totalQty / totalTarget) * 100) : null

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold">
          {MONTHS[now.getMonth()]} / {now.getFullYear()}
        </h2>
        <Link to="/registros" className="btn btn-brand">+ Novo registro</Link>
      </div>

      {/* Card totalizador do mês */}
      <div className="card space-y-3">
        <div className="text-muted text-xs font-medium uppercase tracking-wide">Total do mês</div>

        <div className="grid grid-cols-2 gap-4">
          {/* Valor total em R$ (VALUE products) */}
          <div>
            <div className="text-xs text-muted mb-0.5">Valor produzido</div>
            <div className="text-2xl font-bold leading-none">
              {totalValue > 0 ? brl(totalValue) : <span className="text-muted text-base">—</span>}
            </div>
          </div>

          {/* Quantidade (QTY products: Abertura de Conta, Cartão) */}
          <div>
            <div className="text-xs text-muted mb-0.5">Qtd (contas/cartões)</div>
            <div className="text-2xl font-bold leading-none">
              {totalQty > 0 ? num(totalQty) : <span className="text-muted text-base">—</span>}
            </div>
            {totalTarget > 0 && (
              <div className="text-xs font-bold mt-0.5" style={{ color: pctColor(totalPct) }}>
                {totalPct}% · meta {num(totalTarget)}
              </div>
            )}
          </div>
        </div>

        {totalTarget > 0 && (
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-border)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: Math.min(100, totalPct || 0) + '%', background: 'var(--c-brand)' }} />
          </div>
        )}
      </div>

      {/* Blocos por produto — só onde há produção */}
      {active.length === 0 ? (
        <div className="card text-center text-muted py-8">
          Nenhuma produção registrada este mês ainda.
          <div className="mt-2">
            <Link to="/registros" className="btn btn-brand">Adicionar primeiro registro</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((b) => {
            const pct = b.metricTarget > 0 ? Math.round((b.realized / b.metricTarget) * 100) : null
            const color = pctColor(pct)
            const fmt = (v) => b.useValue ? brl(v) : num(v)
            return (
              <div key={b.product} className="card space-y-1">
                {/* Linha 1: nome do produto */}
                <div className="font-semibold text-sm">{b.product}</div>

                {/* Linha 2: valor realizado + meta + % */}
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-xl font-bold">{fmt(b.realized)}</span>
                    {b.metricTarget > 0 && (
                      <span className="text-sm text-muted"> / {fmt(b.metricTarget)}</span>
                    )}
                  </div>
                  {pct != null && (
                    <span className="text-sm font-bold shrink-0" style={{ color }}>{pct}%</span>
                  )}
                </div>

                {/* Info secundária */}
                {b.useValue && b.quantity > 0 && (
                  <div className="text-xs text-muted">{num(b.quantity)} operação(ões)</div>
                )}
                {!b.useValue && b.value > 0 && (
                  <div className="text-xs text-muted">{brl(b.value)}</div>
                )}

                {b.metricTarget > 0 && (
                  <div className="mt-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--c-border)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: Math.min(100, pct || 0) + '%', background: color }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted text-center">
        Dados locais · offline-first · Defina metas em <Link to="/metas" className="underline">Metas</Link>
      </p>
    </section>
  )
}
