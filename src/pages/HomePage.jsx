import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronUp, ChevronDown, Check } from 'lucide-react'
import { useLiveQuery } from '../hooks/useLiveData.js'
import { useDataVersion } from '../hooks/useDataVersion.js'
import { db } from '../db/db.js'
import { productBreakdown } from '../lib/summaries.js'
import { brl, num, floorPct, FULL_MONTHS } from '../lib/format.js'
import { useRecordModal } from '../context/RecordModalContext.jsx'
import { useMonth } from '../context/MonthContext.jsx'
import { getProgressColor, getRemainingLabel } from '../utils/progressColor.js'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import { computeGrupoProgress, deriveMemberships } from '../utils/grupoCalculations.js'
import { useDisplayOrder } from '../hooks/useDisplayOrder.js'
import { useReorderTransition } from '../hooks/useReorderTransition.js'
import ViewRecordsButton from '../components/ViewRecordsButton.jsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Rotulo de periodo pro PDF do detalhamento — o Resumo e sempre 1 mes so
// (diferente do Acumulado, que mostra semestre/ano — ver AcumuladoPage.jsx).
const monthPeriodLabel = (year, month) => `Mês de ${FULL_MONTHS[Number(month) - 1]} de ${year}`

function GroupsBadge({ count }) {
  if (count <= 1) return null
  return (
    <span style={{
      fontSize: '9px', fontWeight: 600, background: 'rgba(var(--c-brand-rgb),0.15)',
      color: 'var(--c-brand)', borderRadius: '99px', padding: '2px 6px',
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {count} grupos
    </span>
  )
}

function OrderControls({ onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className="flex gap-0.5 shrink-0">
      <button
        className="btn px-1.5 py-1"
        disabled={isFirst}
        onClick={onMoveUp}
        aria-label="Mover para cima"
        style={{ opacity: isFirst ? 0.25 : 0.7 }}
      >
        <ChevronUp size={13} />
      </button>
      <button
        className="btn px-1.5 py-1"
        disabled={isLast}
        onClick={onMoveDown}
        aria-label="Mover para baixo"
        style={{ opacity: isLast ? 0.25 : 0.7 }}
      >
        <ChevronDown size={13} />
      </button>
    </div>
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
// Product leaf — inside a GrupoNode
// ---------------------------------------------------------------------------

function ProductLeaf({ name, realized, target, useValue, depth, parentCount }) {
  const { year, month } = useMonth()
  const fmt = useValue ? brl : num
  const rawPctLeaf = target > 0 ? (realized / target) * 100 : realized > 0 ? 100 : 0
  const pct = target > 0 ? floorPct(rawPctLeaf) : realized > 0 ? 100 : null
  const color = pct != null ? getProgressColor(rawPctLeaf) : '#374151'
  const nodeStyle =
    depth === 1
      ? { borderLeft: `2px solid ${color}`, paddingLeft: '8px', marginLeft: '2px' }
      : { borderLeft: '2px solid rgba(var(--c-brand-rgb),0.2)', paddingLeft: '12px', marginLeft: '8px' }
  const labelSize   = depth === 1 ? '13px' : '12px'
  const labelWeight = depth === 1 ? 500 : 400
  const valueSize   = depth === 1 ? '15px' : '13px'

  return (
    <div style={nodeStyle} className="space-y-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate" style={{ fontWeight: labelWeight, fontSize: labelSize, color: 'var(--text-secondary)' }}>
          {name}
        </span>
        <GroupsBadge count={parentCount} />
        <ViewRecordsButton product={name} year={year} startMonth={month} endMonth={month} periodLabel={monthPeriodLabel(year, month)} />
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
// GrupoNode — recursive renderer
// ---------------------------------------------------------------------------

function GrupoNode({
  grupoId, allGrupos, productDataMap, memberships, productById,
  depth = 0, reordering, onMove, isFirst, isLast,
}) {
  const [open, setOpen] = useState(true)

  const grupo = allGrupos.find((c) => c.id === grupoId)
  if (!grupo) return null

  const children = grupo.children ?? []
  const hasChildren = children.length > 0
  const isAvgPct = grupo.aggregationMode === 'average_pct'

  // In reorder mode root nodes are always collapsed
  const isOpen = (depth === 0 && reordering) ? false : open

  const { realized, target, pct: rawPct } = computeGrupoProgress(grupoId, allGrupos, productDataMap)
  const pct = isAvgPct
    ? (rawPct > 0 ? floorPct(rawPct) : null)
    : (target ?? 0) > 0
      ? floorPct(rawPct)
      : (realized ?? 0) > 0
      ? 100
      : null
  const color = pct != null ? getProgressColor(rawPct) : '#374151'

  const parentCount = memberships.filter((m) => m.childType === 'classe' && m.childId === grupoId).length

  const nodeStyle =
    depth === 0 ? {} :
    depth === 1
      ? { borderLeft: `2px solid ${color}`, paddingLeft: '8px', marginLeft: '2px' }
      : { borderLeft: '2px solid rgba(var(--c-brand-rgb),0.2)', paddingLeft: '12px', marginLeft: '8px' }

  const labelSize   = depth === 0 ? '14px' : depth === 1 ? '13px' : '12px'
  const labelWeight = depth === 0 ? 600    : depth === 1 ? 500    : 400
  const valueSize   = depth === 0 ? '20px' : depth === 1 ? '15px' : '13px'

  const canToggle = !reordering && hasChildren
  const showOrderControls = depth === 0 && reordering && onMove

  const labelRow = (
    <div
      className="flex items-center justify-between gap-2"
      onClick={canToggle ? () => setOpen((o) => !o) : undefined}
      style={canToggle ? { cursor: 'pointer', userSelect: 'none' } : {}}
      aria-expanded={canToggle ? isOpen : undefined}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate" style={{ fontWeight: labelWeight, fontSize: labelSize, color: 'var(--text-secondary)' }}>
          {grupo.name}
        </span>
        <GroupsBadge count={parentCount} />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {showOrderControls && (
          <OrderControls
            isFirst={isFirst}
            isLast={isLast}
            onMoveUp={(e) => { e.stopPropagation(); onMove(grupoId, 'up') }}
            onMoveDown={(e) => { e.stopPropagation(); onMove(grupoId, 'down') }}
          />
        )}
        {!reordering && hasChildren && (
          <ChevronRight
            size={14}
            style={{
              transition: 'transform 0.2s',
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              color: 'var(--text-faint)',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  )

  const valueRow = isAvgPct ? (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {!hasChildren
          ? 'sem itens'
          : children.length === 1
          ? '1 item'
          : `média entre ${children.length} itens`}
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
      value={isAvgPct ? rawPct : (realized ?? 0)}
      max={isAvgPct ? 100 : (target ?? 0)}
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

  const childrenContent = hasChildren && isOpen && (
    <div
      className={depth === 0 ? 'mt-3 pt-3 border-t space-y-3' : 'mt-3 space-y-2'}
      style={depth === 0 ? { borderColor: 'var(--c-border)' } : {}}
    >
      {children.map((child) => {
        if (child.type === 'classe') {
          return (
            <GrupoNode
              key={child.refId}
              grupoId={child.refId}
              allGrupos={allGrupos}
              productDataMap={productDataMap}
              memberships={memberships}
              productById={productById}
              depth={depth + 1}
            />
          )
        }
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
// Standalone product card (not part of any grupo)
// ---------------------------------------------------------------------------

function ProductCard({ b, reordering, onMove, isFirst, isLast }) {
  const { year, month } = useMonth()
  const rawPctCard = b.metricTarget > 0 ? (b.realized / b.metricTarget) * 100 : b.realized > 0 ? 100 : 0
  const pct = b.metricTarget > 0 ? floorPct(rawPctCard) : b.realized > 0 ? 100 : null
  const color = pct != null ? getProgressColor(rawPctCard) : 'var(--text-faint)'
  const fmt = (v) => (b.useValue ? brl(v) : num(v))

  return (
    <div className="card space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{b.product}</span>
          <ViewRecordsButton product={b.product} year={year} startMonth={month} endMonth={month} periodLabel={monthPeriodLabel(year, month)} />
        </div>
        {reordering && onMove && (
          <OrderControls
            isFirst={isFirst}
            isLast={isLast}
            onMoveUp={() => onMove('up')}
            onMoveDown={() => onMove('down')}
          />
        )}
      </div>
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
  const [showZero, setShowZero] = useState(false)
  const [reordering, setReordering] = useState(false)
  const { getSorted, move } = useDisplayOrder()
  const itemRefs = useRef(new Map())

  // Versao que muda a cada escrita no banco (ver dataBus.js) — ao contrario
  // de uma contagem de linhas, tambem reage a EDICOES (que nao mudam a
  // quantidade de registros/metas, so o conteudo deles).
  const dataVersion = useDataVersion()

  const allGrupos   = useLiveQuery(() => db.classes.toArray(),  [], [])
  const allProducts = useLiveQuery(() => db.products.toArray(), [], [])
  const monthGoals  = useLiveQuery(
    () => db.goals.filter((g) => g.year === Number(year) && g.month === Number(month)).toArray(),
    [year, month],
    []
  )

  useEffect(() => {
    let alive = true
    productBreakdown({ year, month }).then((data) => {
      if (alive) setBreakdown(data)
    })
    return () => { alive = false }
  }, [dataVersion, year, month])

  const productById = useMemo(
    () => new Map((allProducts ?? []).map((p) => [p.id, p])),
    [allProducts]
  )

  const productsByName = useMemo(
    () => new Map((allProducts ?? []).map((p) => [p.name, p])),
    [allProducts]
  )

  const productDataMap = useMemo(() => {
    const map = new Map()
    for (const b of breakdown) {
      const prod = productsByName.get(b.product)
      if (prod) map.set(prod.id, { realized: b.realized, target: b.metricTarget })
    }
    return map
  }, [breakdown, productsByName])

  const memberships = useMemo(
    () => deriveMemberships(allGrupos ?? []),
    [allGrupos]
  )

  const childGrupoIds = useMemo(
    () => new Set(memberships.filter((m) => m.childType === 'classe').map((m) => m.childId)),
    [memberships]
  )

  const rootGrupos = useMemo(
    () => (allGrupos ?? []).filter((c) => !childGrupoIds.has(c.id)),
    [allGrupos, childGrupoIds]
  )

  const grupoChildProductIds = useMemo(
    () => new Set(memberships.filter((m) => m.childType === 'product').map((m) => m.childId)),
    [memberships]
  )

  // Produtos zerados ficam separados dos com producao: entram sempre no fim
  // da lista (nunca misturados via getSorted com os demais), pra ligar
  // "Mostrar zerados" so acrescentar linhas no rodape em vez de reordenar
  // tudo que ja esta visivel — e, se um zerado ganhar producao, ele sai
  // desse grupo e passa a ocupar sua posicao normal entre os demais.
  const standaloneBreakdown = useMemo(
    () => breakdown.filter((b) => {
      const prod = productsByName.get(b.product)
      return prod && !grupoChildProductIds.has(prod.id) && b.realized > 0
    }),
    [breakdown, productsByName, grupoChildProductIds]
  )

  const zeroBreakdown = useMemo(() => {
    if (!showZero) return []
    const shown = new Set(standaloneBreakdown.map((b) => b.product))
    const extras = []
    const seen = new Set()
    for (const g of (monthGoals ?? [])) {
      const prod = productsByName.get(g.product)
      if (!prod) continue
      if (grupoChildProductIds.has(prod.id)) continue
      if (shown.has(g.product)) continue
      if (seen.has(g.product)) continue
      seen.add(g.product)
      const useValue = prod.useValue ?? false
      extras.push({
        product: g.product,
        realized: 0,
        value: 0,
        quantity: 0,
        metricTarget: useValue ? (g.targetValue ?? 0) : (g.targetQuantity ?? 0),
        useValue,
      })
    }
    return extras
  }, [showZero, standaloneBreakdown, productsByName, grupoChildProductIds, monthGoals])

  // Build sorted display list combining root grupos and standalone products
  const sortedItems = useMemo(() => {
    const grupoKeys   = rootGrupos.map((g) => `g:${g.id}`)
    const productKeys = standaloneBreakdown.map((b) => {
      const prod = productsByName.get(b.product)
      return `p:${prod?.id ?? b.product}`
    })
    const zeroKeys = zeroBreakdown.map((b) => {
      const prod = productsByName.get(b.product)
      return `p:${prod?.id ?? b.product}`
    })
    const ordered = [...getSorted([...grupoKeys, ...productKeys]), ...getSorted(zeroKeys)]
    const allBreakdown = [...standaloneBreakdown, ...zeroBreakdown]
    return ordered.map((key) => {
      if (key.startsWith('g:')) {
        const grp = rootGrupos.find((g) => g.id === key.slice(2))
        return grp ? { key, kind: 'grupo', grp } : null
      }
      const prodId = key.slice(2)
      const b = allBreakdown.find((sb) => productsByName.get(sb.product)?.id === prodId)
      return b ? { key, kind: 'product', b } : null
    }).filter(Boolean)
  }, [rootGrupos, standaloneBreakdown, zeroBreakdown, productsByName, getSorted])

  const sortedKeys = useMemo(() => sortedItems.map((i) => i.key), [sortedItems])
  useReorderTransition(itemRefs, sortedKeys.join(','))

  const hasAnyProduction = sortedItems.length > 0

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
          {sortedItems.map(({ key, kind, grp, b }, idx) => {
            const isFirst = idx === 0
            const isLast  = idx === sortedItems.length - 1
            return (
              <div key={key} ref={(el) => { if (el) itemRefs.current.set(key, el); else itemRefs.current.delete(key) }}>
                {kind === 'grupo' ? (
                  <GrupoNode
                    grupoId={grp.id}
                    allGrupos={allGrupos ?? []}
                    productDataMap={productDataMap}
                    memberships={memberships}
                    productById={productById}
                    depth={0}
                    reordering={reordering}
                    onMove={(gId, dir) => move(`g:${gId}`, sortedKeys, dir)}
                    isFirst={isFirst}
                    isLast={isLast}
                  />
                ) : (
                  <ProductCard
                    b={b}
                    reordering={reordering}
                    onMove={(dir) => move(key, sortedKeys, dir)}
                    isFirst={isFirst}
                    isLast={isLast}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom controls */}
      <div className="flex gap-2">
        <button
          className="btn flex-1 text-sm"
          style={showZero ? {
            background: 'rgba(var(--c-brand-rgb),0.12)',
            borderColor: 'rgba(var(--c-brand-rgb),0.4)',
            color: 'var(--c-brand)',
          } : {}}
          onClick={() => setShowZero((v) => !v)}
        >
          {showZero ? 'Ocultar zerados' : 'Mostrar zerados'}
        </button>
        <button
          className="btn flex-1 text-sm"
          style={reordering ? {
            background: 'rgba(var(--c-brand-rgb),0.12)',
            borderColor: 'rgba(var(--c-brand-rgb),0.4)',
            color: 'var(--c-brand)',
          } : {}}
          onClick={() => setReordering((v) => !v)}
        >
          {reordering ? 'Salvar' : 'Reordenar'}
        </button>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
        Dados locais · offline-first · Defina metas em{' '}
        <Link to="/metas" className="underline" style={{ color: 'var(--c-brand)' }}>Metas</Link>
      </p>
    </section>
  )
}
