import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { productBreakdown } from '../lib/summaries.js'
import { MONTHS, num, brl, CREDIT_HIERARCHY, CREDIT_GROUPS, CREDIT_LEAVES } from '../lib/format.js'
import { useRecordModal } from '../context/RecordModalContext.jsx'

const pctColor = (p) =>
  p == null ? 'var(--c-muted)' : p >= 100 ? 'var(--c-good)' : p >= 60 ? 'var(--c-warn)' : 'var(--c-bad)'

// Todos os produtos do bloco de crédito (folhas + grupos virtuais)
const ALL_CREDIT = new Set([...CREDIT_GROUPS, ...CREDIT_LEAVES])

// Cartão expandível para a hierarquia de crédito
function CreditNode({ name, dataMap, depth = 0 }) {
  const [expanded, setExpanded] = useState(false)
  const children = CREDIT_HIERARCHY[name]
  const entry = dataMap.get(name)
  const realized = entry?.realized ?? 0
  const metricTarget = entry?.metricTarget ?? 0
  const pct = metricTarget > 0 ? Math.round((realized / metricTarget) * 100) : null
  const color = pctColor(pct)

  const header = (
    <div className="flex items-center justify-between gap-2">
      <span className={`font-semibold ${depth === 0 ? 'text-sm' : 'text-xs'} truncate`}>{name}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`font-bold tabular-nums ${depth === 0 ? 'text-xl' : 'text-base'}`}>
          {brl(realized)}
        </span>
        {pct != null && (
          <span className="text-xs font-bold tabular-nums" style={{ color }}>{pct}%</span>
        )}
        {children && (
          <button
            className="btn px-1.5 py-0.5 text-xs shrink-0"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>
    </div>
  )

  if (depth === 0) {
    return (
      <div className="card space-y-1">
        {header}
        {metricTarget > 0 && (
          <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--c-border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: Math.min(100, pct || 0) + '%', background: color }}
            />
          </div>
        )}
        {expanded && children && (
          <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: 'var(--c-border)' }}>
            {children.map((child) => (
              <CreditNode key={child} name={child} dataMap={dataMap} depth={1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pl-3 border-l space-y-1" style={{ borderColor: 'var(--c-border)' }}>
      {header}
      {expanded && children && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <CreditNode key={child} name={child} dataMap={dataMap} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCard({ b }) {
  const pct = b.metricTarget > 0 ? Math.round((b.realized / b.metricTarget) * 100) : null
  const color = pctColor(pct)
  const fmt = (v) => (b.useValue ? brl(v) : num(v))
  return (
    <div className="card space-y-1">
      <div className="font-semibold text-sm">{b.product}</div>
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
      {b.useValue && b.quantity > 0 && (
        <div className="text-xs text-muted">{num(b.quantity)} operação(ões)</div>
      )}
      {!b.useValue && b.value > 0 && (
        <div className="text-xs text-muted">{brl(b.value)}</div>
      )}
      {b.metricTarget > 0 && (
        <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--c-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: Math.min(100, pct || 0) + '%', background: color }}
          />
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const { open } = useRecordModal()
  const now = new Date()
  const [breakdown, setBreakdown] = useState([])

  const tick = useLiveQuery(
    async () => (await db.records.count()) + (await db.goals.count()),
    [],
    0
  )

  useEffect(() => {
    let alive = true
    productBreakdown().then((data) => {
      if (alive) setBreakdown(data)
    })
    return () => { alive = false }
  }, [tick])

  const dataMap = useMemo(() => new Map(breakdown.map((b) => [b.product, b])), [breakdown])

  // Produtos não-crédito com produção realizada
  const flatActive = breakdown.filter((b) => b.realized > 0 && !ALL_CREDIT.has(b.product))

  // Bloco de crédito: mostra se há produção ou meta definida
  const creditEntry = dataMap.get('Credito Total')
  const showCredit = creditEntry && (creditEntry.realized > 0 || creditEntry.metricTarget > 0)

  const hasAnyProduction = flatActive.length > 0 || showCredit

  // Total do mês — exclui grupos virtuais para não contar em dobro
  const totalQty = breakdown
    .filter((b) => !b.useValue && !CREDIT_GROUPS.has(b.product))
    .reduce((s, b) => s + b.quantity, 0)
  const totalValue = breakdown
    .filter((b) => !CREDIT_GROUPS.has(b.product))
    .reduce((s, b) => s + b.value, 0)
  const totalTargetQty = breakdown
    .filter((b) => !b.useValue && !CREDIT_GROUPS.has(b.product))
    .reduce((s, b) => s + b.targetQty, 0)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold">
          {MONTHS[now.getMonth()]} / {now.getFullYear()}
        </h2>
      </div>

      {/* Card totalizador */}
      <div className="card space-y-3">
        <div className="text-muted text-xs font-medium uppercase tracking-wide">Total do mês</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted mb-0.5">Valor produzido</div>
            <div className="text-2xl font-bold leading-none">
              {totalValue > 0 ? brl(totalValue) : <span className="text-muted text-base">—</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted mb-0.5">Qtd (contas/cartões)</div>
            <div className="text-2xl font-bold leading-none">
              {totalQty > 0 ? num(totalQty) : <span className="text-muted text-base">—</span>}
            </div>
            {totalTargetQty > 0 && (
              <div className="text-xs text-muted mt-0.5">meta {num(totalTargetQty)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Blocos por produto */}
      {!hasAnyProduction ? (
        <div className="card text-center text-muted py-8">
          Nenhuma produção registrada este mês ainda.
          <div className="mt-2">
            <button className="btn btn-brand" onClick={() => open()}>Adicionar primeiro registro</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Crédito Total — árvore expansível */}
          {showCredit && (
            <CreditNode name="Credito Total" dataMap={dataMap} depth={0} />
          )}
          {/* Demais produtos */}
          {flatActive.map((b) => (
            <ProductCard key={b.product} b={b} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted text-center">
        Dados locais · offline-first · Defina metas em{' '}
        <Link to="/metas" className="underline">Metas</Link>
      </p>
    </section>
  )
}
