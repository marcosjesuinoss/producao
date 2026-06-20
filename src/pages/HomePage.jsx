import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CornerDownRight, Check } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { productBreakdown } from '../lib/summaries.js'
import { num, brl, CREDIT_HIERARCHY, CREDIT_GROUPS, CREDIT_LEAVES } from '../lib/format.js'
import { useRecordModal } from '../context/RecordModalContext.jsx'
import { useMonth } from '../context/MonthContext.jsx'
import { getProgressColor, getRemainingLabel } from '../utils/progressColor.js'
import ProgressBar from '../components/ui/ProgressBar.jsx'

const ALL_CREDIT = new Set([...CREDIT_GROUPS, ...CREDIT_LEAVES])

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

function CreditNode({ name, dataMap, depth = 0 }) {
  const [open, setOpen] = useState(true)
  const children = CREDIT_HIERARCHY[name]
  const isLeaf = !children
  const entry = dataMap.get(name)
  const realized = entry?.realized ?? 0
  const metricTarget = entry?.metricTarget ?? 0
  const pct = metricTarget > 0 ? Math.round((realized / metricTarget) * 100) : realized > 0 ? 100 : null
  const color = pct != null ? getProgressColor(pct) : '#374151'

  // Left border accent per level (unchanged)
  const nodeStyle =
    depth === 1
      ? { borderLeft: `2px solid ${color}`, paddingLeft: '8px', marginLeft: '2px' }
      : depth >= 2
      ? { borderLeft: '2px solid rgba(99,102,241,0.2)', paddingLeft: '12px', marginLeft: '8px' }
      : {}

  // Font sizes per level
  const labelSize = depth === 0 ? '14px' : depth === 1 ? '13px' : '12px'
  const labelWeight = depth === 0 ? 600 : depth === 1 ? 500 : 400
  const labelColor = 'var(--text-secondary)'
  const valueSize = depth === 0 ? '20px' : depth === 1 ? '15px' : '13px'

  // Row 1 — label + chevron (entire row clickable when has children)
  const labelRow = (
    <div
      className="flex items-center justify-between gap-2"
      onClick={children ? () => setOpen((o) => !o) : undefined}
      style={children ? { cursor: 'pointer', userSelect: 'none' } : {}}
      aria-expanded={children ? open : undefined}
    >
      <span className="truncate" style={{ fontWeight: labelWeight, fontSize: labelSize, color: labelColor }}>
        {name}
      </span>
      {children && (
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

  // Row 2 — value bold + "/ target" muted | % badge
  const valueRow = (
    <div className="flex items-baseline justify-between gap-2">
      <div>
        <span className="font-bold tabular-nums" style={{ fontSize: valueSize, color: 'var(--text-primary)' }}>
          {brl(realized)}
        </span>
        {metricTarget > 0 && (
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {' / '}{brl(metricTarget)}
          </span>
        )}
      </div>
      {pct != null && (
        <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color }}>{pct}%</span>
      )}
    </div>
  )

  // Row 3 — ProgressBar (leaves always; groups only when has target)
  const showBar = isLeaf || metricTarget > 0
  const barRow = showBar ? (
    <ProgressBar
      value={realized}
      max={metricTarget}
      height={depth === 0 ? 5 : depth === 1 ? 4 : 3}
    />
  ) : null

  const remainingRow = (
    <RemainingLine value={realized} target={metricTarget} fmt={brl} fontSize={depth === 0 ? '12px' : '11px'} />
  )

  if (depth === 0) {
    return (
      <div className="card space-y-1">
        {labelRow}
        {valueRow}
        {barRow}
        {remainingRow}
        {open && children && (
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
    <div style={nodeStyle} className="space-y-1">
      {labelRow}
      {valueRow}
      {barRow}
      {remainingRow}
      {open && children && (
        <div className="mt-3 space-y-2">
          {children.map((child) => (
            <CreditNode key={child} name={child} dataMap={dataMap} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

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

export default function HomePage() {
  const { open } = useRecordModal()
  const { year, month } = useMonth()
  const [breakdown, setBreakdown] = useState([])

  const tick = useLiveQuery(
    async () => (await db.records.count()) + (await db.goals.count()),
    [],
    0
  )

  useEffect(() => {
    let alive = true
    productBreakdown({ year, month }).then((data) => {
      if (alive) setBreakdown(data)
    })
    return () => { alive = false }
  }, [tick, year, month])

  const dataMap = useMemo(() => new Map(breakdown.map((b) => [b.product, b])), [breakdown])
  const flatActive = breakdown.filter((b) => b.realized > 0 && !ALL_CREDIT.has(b.product))
  const creditEntry = dataMap.get('Credito Total')
  const showCredit = creditEntry && (creditEntry.realized > 0 || creditEntry.metricTarget > 0)
  const hasAnyProduction = flatActive.length > 0 || showCredit

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
          {showCredit && (
            <CreditNode name="Credito Total" dataMap={dataMap} depth={0} />
          )}
          {flatActive.map((b) => (
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
