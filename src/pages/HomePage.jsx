import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Check } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { productBreakdown } from '../lib/summaries.js'
import { brl, num } from '../lib/format.js'
import { useRecordModal } from '../context/RecordModalContext.jsx'
import { useMonth } from '../context/MonthContext.jsx'
import { getProgressColor, getRemainingLabel } from '../utils/progressColor.js'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import { computeClasseProgress, deriveMemberships } from '../utils/classeCalculations.js'

// ---------------------------------------------------------------------------
// Helpers shared by ClasseNode and ProductLeaf
// ---------------------------------------------------------------------------

function GroupsBadge({ count }) {
  if (count <= 1) return null
  return (
    <span style={{
      fontSize: '9px', fontWeight: 600, background: 'rgba(99,102,241,0.15)',
      color: '#818cf8', borderRadius: '99px', padding: '2px 6px',
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {count} grupos
    </span>
  )
}

function RemainingLine({ value, target, fmt = brl, fontSize = '11px' }) {
  const info = getRemainingLabel(value, target)
  if (!info) return null
  if (info.type === 'excess') {
    return (
      <div className="flex items-center gap-1" style={{ fontSize }}>
        <Check size={12} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
        <span style={{ color: 'var(--accent-green)' }}>
          meta batida — excedente de <span style={{ fontWeight: 600 }}>{fmt(info.amount)}</span>
        </span>
      </div>
    )
  }
  return (
    <div style={{ fontSize }}>
      <span style={{ color: 'var(--text-muted)' }}>faltam </span>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{fmt(info.amount)}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product leaf — renders a single product inside a ClasseNode
// ---------------------------------------------------------------------------

function ProductLeaf({ name, realized, target, useValue, depth, parentCount }) {
  const fmt = useValue ? brl : num
  const pct = target > 0 ? Math.round((realized / target) * 100) : realized > 0 ? 100 : null
  const color = pct != null ? getProgressColor(pct) : '#374151'
  const nodeStyle =
    depth === 1
      ? { borderLeft: `2px solid ${color}`, paddingLeft: '8px', marginLeft: '2px' }
      : { borderLeft: '2px solid rgba(99,102,241,0.2)', paddingLeft: '12px', marginLeft: '8px' }
  const labelSize = depth === 1 ? '13px' : '12px'
  const labelWeight = depth === 1 ? 500 : 400
  const valueSize = depth === 1 ? '15px' : '13px'

  return (
    <div style={nodeStyle} className="space-y-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate" style={{ fontWeight: labelWeight, fontSize: labelSize, color: 'var(--text-secondary)' }}>
          {name}
        </span>
        <GroupsBadge count={parentCount} />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="font-bold tabular-nums" style={{ fontSize: valueSize, color: 'var(--text-primary)' }}>
            {fmt(realized)}
          </span>
          {target > 0 && (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{' / '}{fmt(target)}</span>
          )}
        </div>
        {pct != null && (
          <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color }}>{pct}%</span>
        )}
      </div>
      <ProgressBar value={realized} max={target} height={depth === 1 ? 4 : 3} />
      <RemainingLine value={realized} target={target} fmt={fmt} fontSize="11px" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClasseNode — recursive renderer for a DB classe and its children
// ---------------------------------------------------------------------------

function ClasseNode({ classeId, allClasses, productDataMap, memberships, productById, depth = 0 }) {
  const [open, setOpen] = useState(true)

  const classe = allClasses.find((c) => c.id === classeId)
  if (!classe) return null

  const children = classe.children ?? []
  const hasChildren = children.length > 0
  const isAvgPct = classe.aggregationMode === 'average_pct'

  const { realized, target, pct: rawPct } = computeClasseProgress(classeId, allClasses, productDataMap)
  // Match original CreditNode logic: no % badge when target=0 and realized=0
  const pct = isAvgPct
    ? (rawPct > 0 ? Math.round(rawPct) : null)
    : (target ?? 0) > 0
      ? Math.round(rawPct)
      : (realized ?? 0) > 0
      ? 100
      : null
  const color = pct != null ? getProgressColor(pct) : '#374151'

  const parentCount = memberships.filter((m) => m.childType === 'classe' && m.childId === classeId).length

  const nodeStyle =
    depth === 0 ? {} :
    depth === 1
      ? { borderLeft: `2px solid ${color}`, paddingLeft: '8px', marginLeft: '2px' }
      : { borderLeft: '2px solid rgba(99,102,241,0.2)', paddingLeft: '12px', marginLeft: '8px' }

  const labelSize   = depth === 0 ? '14px' : depth === 1 ? '13px' : '12px'
  const labelWeight = depth === 0 ? 600    : depth === 1 ? 500    : 400
  const valueSize   = depth === 0 ? '20px' : depth === 1 ? '15px' : '13px'

  const labelRow = (
    <div
      className="flex items-center justify-between gap-2"
      onClick={hasChildren ? () => setOpen((o) => !o) : undefined}
      style={hasChildren ? { cursor: 'pointer', userSelect: 'none' } : {}}
      aria-expanded={hasChildren ? open : undefined}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate" style={{ fontWeight: labelWeight, fontSize: labelSize, color: 'var(--text-secondary)' }}>
          {classe.name}
        </span>
        <GroupsBadge count={parentCount} />
      </div>
      {hasChildren && (
        <ChevronRight
          size={14}
          style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            color: 'var(--text-faint)',
            flexShrink: 0,
          }}
        />
      )}
    </div>
  )

  const valueRow = isAvgPct ? (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {hasChildren
          ? `média entre ${children.length} ${children.length === 1 ? 'item' : 'itens'}`
          : 'sem itens'}
      </span>
      {pct != null && pct > 0 && (
        <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color }}>{pct}%</span>
      )}
    </div>
  ) : (
    <div className="flex items-baseline justify-between gap-2">
      <div>
        <span className="font-bold tabular-nums" style={{ fontSize: valueSize, color: 'var(--text-primary)' }}>
          {brl(realized ?? 0)}
        </span>
        {(target ?? 0) > 0 && (
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {' / '}{brl(target)}
          </span>
        )}
      </div>
      {pct != null && (
        <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color }}>{pct}%</span>
      )}
    </div>
  )

  const barRow = (
    <ProgressBar
      value={realized ?? 0}
      max={target ?? 0}
      height={depth === 0 ? 5 : depth === 1 ? 4 : 3}
    />
  )

  const remainingRow = isAvgPct ? null : (
    <RemainingLine
      value={realized ?? 0}
      target={target ?? 0}
      fmt={brl}
      fontSize={depth === 0 ? '12px' : '11px'}
    />
  )

  const childrenContent = hasChildren && open && (
    <div
      className={depth === 0 ? 'mt-3 pt-3 border-t space-y-3' : 'mt-3 space-y-2'}
      style={depth === 0 ? { borderColor: 'var(--c-border)' } : {}}
    >
      {children.map((child) => {
        if (child.type === 'classe') {
          return (
            <ClasseNode
              key={child.refId}
              classeId={child.refId}
              allClasses={allClasses}
              productDataMap={productDataMap}
              memberships={memberships}
              productById={productById}
              depth={depth + 1}
            />
          )
        }
        // product leaf
        const prod = productById.get(child.refId)
        const data = productDataMap.get(child.refId) || { realized: 0, target: 0 }
        const pCount = memberships.filter((m) => m.childType === 'product' && m.childId === child.refId).length
        return (
          <ProductLeaf
            key={child.refId}
            name={prod?.name ?? '(removido)'}
            realized={data.realized}
            target={data.target}
            useValue={prod?.useValue ?? true}
            depth={depth + 1}
            parentCount={pCount}
          />
        )
      })}
    </div>
  )

  if (depth === 0) {
    return (
      <div className="card space-y-1">
        {labelRow}
        {valueRow}
        {barRow}
        {remainingRow}
        {childrenContent}
      </div>
    )
  }

  return (
    <div style={nodeStyle} className="space-y-1">
      {labelRow}
      {valueRow}
      {barRow}
      {remainingRow}
      {childrenContent}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Standalone product card (not part of any classe)
// ---------------------------------------------------------------------------

function ProductCard({ b }) {
  const pct = b.metricTarget > 0 ? Math.round((b.realized / b.metricTarget) * 100) : b.realized > 0 ? 100 : null
  const color = pct != null ? getProgressColor(pct) : 'var(--text-faint)'
  const fmt = (v) => (b.useValue ? brl(v) : num(v))

  return (
    <div className="card space-y-1">
      <div className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>{b.product}</div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(b.realized)}</span>
          {b.metricTarget > 0 && (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}> / {fmt(b.metricTarget)}</span>
          )}
        </div>
        {pct != null && (
          <span className="text-sm font-bold shrink-0" style={{ color }}>{pct}%</span>
        )}
      </div>
      {b.useValue && b.quantity > 0 && (
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{num(b.quantity)} operação(ões)</div>
      )}
      {!b.useValue && b.value > 0 && (
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{brl(b.value)}</div>
      )}
      {(b.metricTarget > 0 || b.realized > 0) && (
        <div className="mt-1">
          <ProgressBar value={b.realized} max={b.metricTarget} height={4} />
        </div>
      )}
      <RemainingLine value={b.realized} target={b.metricTarget} fmt={fmt} fontSize="11px" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const { open } = useRecordModal()
  const { year, month } = useMonth()
  const [breakdown, setBreakdown] = useState([])

  const tick = useLiveQuery(
    async () => (await db.records.count()) + (await db.goals.count()),
    [],
    0
  )

  const allClasses  = useLiveQuery(() => db.classes.toArray(),  [], [])
  const allProducts = useLiveQuery(() => db.products.toArray(), [], [])

  useEffect(() => {
    let alive = true
    productBreakdown({ year, month }).then((data) => {
      if (alive) setBreakdown(data)
    })
    return () => { alive = false }
  }, [tick, year, month])

  // Map<productId, product> for name/useValue lookup
  const productById = useMemo(
    () => new Map((allProducts ?? []).map((p) => [p.id, p])),
    [allProducts]
  )

  // Map<productName, product> — for joining breakdown (keyed by name) to product IDs
  const productsByName = useMemo(
    () => new Map((allProducts ?? []).map((p) => [p.name, p])),
    [allProducts]
  )

  // Map<productId, {realized, target}> — metric values from the async breakdown
  const productDataMap = useMemo(() => {
    const map = new Map()
    for (const b of breakdown) {
      const prod = productsByName.get(b.product)
      if (prod) map.set(prod.id, { realized: b.realized, target: b.metricTarget })
    }
    return map
  }, [breakdown, productsByName])

  // Flat membership list and derived sets
  const memberships = useMemo(
    () => deriveMemberships(allClasses ?? []),
    [allClasses]
  )

  const childClasseIds = useMemo(
    () => new Set(memberships.filter((m) => m.childType === 'classe').map((m) => m.childId)),
    [memberships]
  )

  const rootClasses = useMemo(
    () => (allClasses ?? []).filter((c) => !childClasseIds.has(c.id)),
    [allClasses, childClasseIds]
  )

  // Products that belong to at least one classe → excluded from standalone cards
  const classChildProductIds = useMemo(
    () => new Set(memberships.filter((m) => m.childType === 'product').map((m) => m.childId)),
    [memberships]
  )

  // Standalone products: not in any classe AND have production data this month
  const standaloneBreakdown = useMemo(
    () => breakdown.filter((b) => {
      const prod = productsByName.get(b.product)
      return prod && !classChildProductIds.has(prod.id) && b.realized > 0
    }),
    [breakdown, productsByName, classChildProductIds]
  )

  const hasAnyProduction = standaloneBreakdown.length > 0 || rootClasses.length > 0

  return (
    <section className="space-y-4">
      {!hasAnyProduction ? (
        <div className="card text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Nenhuma produção registrada este mês ainda.
          <div className="mt-2">
            <button className="btn btn-brand" onClick={() => open()}>Adicionar primeiro registro</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rootClasses.map((cls) => (
            <ClasseNode
              key={cls.id}
              classeId={cls.id}
              allClasses={allClasses ?? []}
              productDataMap={productDataMap}
              memberships={memberships}
              productById={productById}
              depth={0}
            />
          ))}
          {standaloneBreakdown.map((b) => (
            <ProductCard key={b.product} b={b} />
          ))}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
        Dados locais · offline-first · Defina metas em{' '}
        <Link to="/metas" className="underline" style={{ color: 'var(--accent-indigo)' }}>Metas</Link>
      </p>
    </section>
  )
}
