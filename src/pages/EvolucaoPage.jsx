import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useLiveQuery } from '../hooks/useLiveData.js'
import { db } from '../db/db.js'
import { evolucaoBreakdown } from '../lib/evolucao.js'
import { computeGrupoProgress, deriveMemberships, getAllDescendants } from '../utils/grupoCalculations.js'
import { getProgressColor } from '../utils/progressColor.js'
import { brl, num, floorPct } from '../lib/format.js'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import EvolucaoChart from '../components/ui/EvolucaoChart.jsx'
import { useMonth } from '../context/MonthContext.jsx'

// Soma as series diarias de todos os produtos-folha de um grupo 'sum' —
// so faz sentido pra esse modo (valores absolutos, unidade comum em R$).
function buildGrupoSeries(grupoId, allGrupos, seriesByProductId, totalDays) {
  if (!totalDays) return null
  const leafProducts = getAllDescendants(grupoId, allGrupos).filter((d) => d.type === 'product')
  const series = Array.from({ length: totalDays }, (_, i) => ({ day: i + 1, cumulativeActual: 0, cumulativeExpected: 0 }))
  let found = false
  for (const leaf of leafProducts) {
    const prodSeries = seriesByProductId.get(leaf.refId)
    if (!prodSeries) continue
    found = true
    prodSeries.forEach((p, i) => {
      series[i].cumulativeExpected += p.cumulativeExpected
      series[i].cumulativeActual = p.cumulativeActual == null ? null : (series[i].cumulativeActual ?? 0) + p.cumulativeActual
    })
  }
  return found ? series : null
}

// Rotulo textual do ritmo — reaproveita a paleta de cores de getProgressColor,
// mas com texto proprio (RemainingLine da tela Acumulado fala de "meta
// batida", que nao se aplica aqui: aqui e sempre sobre estar ou nao em dia).
function PaceLine({ realized, expectedToDate, fmt = brl, fontSize = '11px' }) {
  if (expectedToDate <= 0) return null
  const diff = realized - expectedToDate
  if (diff >= 0) {
    return (
      <div className="flex items-center gap-1" style={{ fontSize }}>
        <span style={{ color: 'var(--accent-green)' }}>
          adiantado — <span style={{ fontWeight: 600 }}>{fmt(diff)}</span> à frente do ritmo
        </span>
      </div>
    )
  }
  return (
    <div style={{ fontSize }}>
      <span style={{ color: 'var(--text-muted)' }}>faltam </span>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{fmt(-diff)}</span>
      <span style={{ color: 'var(--text-muted)' }}> pra ficar em dia</span>
    </div>
  )
}

// Bloco de exibicao de ritmo — reaproveitado tanto pra produtos avulsos
// quanto pra grupos (modo 'sum' com valores absolutos, ou 'average_pct'
// comparando o % medio atual contra o % linear esperado ate agora).
function PaceBlock({ label, isAvgPct, realized, expectedToDate, useValue, avgPct, linearExpectedPct, size, hasChildren, open, onToggle }) {
  const fmt = useValue ? brl : num
  const sizes = {
    lg: { label: '14px', value: '20px', weight: 600 },
    md: { label: '13px', value: '15px', weight: 500 },
    sm: { label: '12px', value: '13px', weight: 400 },
  }[size]

  let raw, pct
  if (isAvgPct) {
    raw = linearExpectedPct > 0 ? (avgPct / linearExpectedPct) * 100 : (avgPct > 0 ? 100 : 0)
    pct = (avgPct > 0 || linearExpectedPct > 0) ? floorPct(raw) : null
  } else {
    raw = expectedToDate > 0 ? (realized / expectedToDate) * 100 : (realized > 0 ? 100 : 0)
    pct = (expectedToDate > 0 || realized > 0) ? floorPct(raw) : null
  }
  const color = pct != null ? getProgressColor(raw) : '#374151'

  return (
    <div className="space-y-1">
      <div
        className="flex items-center justify-between gap-2"
        onClick={hasChildren ? onToggle : undefined}
        style={hasChildren ? { cursor: 'pointer', userSelect: 'none' } : {}}
      >
        <span className="truncate" style={{ fontWeight: sizes.weight, fontSize: sizes.label, color: 'var(--text-secondary)' }}>
          {label}
        </span>
        {hasChildren && (
          <ChevronRight size={14} style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            color: 'var(--text-faint)', flexShrink: 0,
          }} />
        )}
      </div>

      {isAvgPct ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            no mês: {floorPct(avgPct ?? 0)}% · esperado {floorPct(linearExpectedPct)}%
          </span>
          {pct != null && <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color }}>{pct}%</span>}
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <span className="font-bold tabular-nums" style={{ fontSize: sizes.value, color: 'var(--text-primary)' }}>
              {fmt(realized)}
            </span>
            {expectedToDate > 0 && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{' / '}{fmt(expectedToDate)}</span>}
          </div>
          {pct != null && <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color }}>{pct}%</span>}
        </div>
      )}

      <ProgressBar
        value={isAvgPct ? (avgPct ?? 0) : realized}
        max={isAvgPct ? linearExpectedPct : expectedToDate}
        height={sizes === sizes ? (size === 'lg' ? 5 : size === 'md' ? 4 : 3) : 4}
      />

      {!isAvgPct && <PaceLine realized={realized} expectedToDate={expectedToDate} fmt={fmt} fontSize={size === 'sm' ? '11px' : '12px'} />}
    </div>
  )
}

function GrupoPaceNode({ grupoId, allGrupos, productDataMap, productsById, linearExpectedPct, depth = 0 }) {
  const [open, setOpen] = useState(true)
  const grupo = allGrupos.find((g) => g.id === grupoId)
  if (!grupo) return null

  const children = grupo.children ?? []
  const hasChildren = children.length > 0
  const isAvgPct = grupo.aggregationMode === 'average_pct'
  const { realized, target, pct: avgPct } = computeGrupoProgress(grupoId, allGrupos, productDataMap)
  const expectedToDate = (target ?? 0) * (linearExpectedPct / 100)

  const size = depth === 0 ? 'lg' : depth === 1 ? 'md' : 'sm'
  const nodeStyle = depth === 0 ? {} : { borderLeft: '2px solid rgba(99,102,241,0.2)', paddingLeft: depth === 1 ? '8px' : '12px', marginLeft: depth === 1 ? '2px' : '8px' }

  const inner = (
    <div style={depth > 0 ? nodeStyle : {}} className="space-y-1">
      <PaceBlock
        label={grupo.name} isAvgPct={isAvgPct} realized={realized ?? 0} expectedToDate={expectedToDate}
        useValue avgPct={avgPct} linearExpectedPct={linearExpectedPct} size={size}
        hasChildren={hasChildren} open={open} onToggle={() => setOpen((o) => !o)}
      />

      {hasChildren && open && (
        <div className={depth === 0 ? 'mt-3 pt-3 border-t space-y-3' : 'mt-3 space-y-2'} style={depth === 0 ? { borderColor: 'var(--c-border)' } : {}}>
          {children.map((child) => {
            if (child.type === 'classe') {
              return (
                <GrupoPaceNode key={child.refId} grupoId={child.refId} allGrupos={allGrupos}
                  productDataMap={productDataMap} productsById={productsById}
                  linearExpectedPct={linearExpectedPct} depth={depth + 1} />
              )
            }
            const prod = productsById.get(child.refId)
            const data = productDataMap.get(child.refId) || { realized: 0, target: 0 }
            const leafExpected = data.target * (linearExpectedPct / 100)
            return (
              <PaceBlock key={child.refId} label={prod?.name ?? '(removido)'} isAvgPct={false}
                realized={data.realized} expectedToDate={leafExpected} useValue={prod?.useValue ?? true}
                size={depth + 1 === 1 ? 'md' : 'sm'} hasChildren={false} />
            )
          })}
        </div>
      )}
    </div>
  )

  if (depth === 0) return <div className="card space-y-1">{inner}</div>
  return inner
}

function ProdutoPaceCard({ b, linearExpectedPct }) {
  const expectedToDate = b.target * (linearExpectedPct / 100)
  return (
    <div className="card space-y-1">
      <PaceBlock label={b.product} isAvgPct={false} realized={b.realized} expectedToDate={expectedToDate}
        useValue={b.useValue} size="lg" hasChildren={false} />
    </div>
  )
}

export default function EvolucaoPage() {
  const { year, month } = useMonth()
  const [selected, setSelected] = useState(null) // { type: 'product'|'grupo', id }

  const breakdown = useLiveQuery(() => evolucaoBreakdown({ year, month }), [year, month], null)
  const allGrupos = useLiveQuery(() => db.classes.toArray(), [], [])
  const allProducts = useLiveQuery(() => db.products.toArray(), [], [])

  const productsById = useMemo(() => new Map((allProducts ?? []).map((p) => [p.id, p])), [allProducts])

  const breakdownProducts = breakdown?.products ?? []

  const seriesByProductId = useMemo(() => {
    const map = new Map()
    for (const b of breakdownProducts) if (b.productId != null) map.set(b.productId, b.series)
    return map
  }, [breakdownProducts])

  const productDataMap = useMemo(() => {
    const map = new Map()
    for (const b of breakdownProducts) if (b.productId != null) map.set(b.productId, { realized: b.realized, target: b.target })
    return map
  }, [breakdownProducts])

  const memberships = useMemo(() => deriveMemberships(allGrupos), [allGrupos])
  const childGrupoIds = useMemo(() => new Set(memberships.filter((m) => m.childType === 'classe').map((m) => m.childId)), [memberships])
  const rootGrupos = useMemo(() => (allGrupos ?? []).filter((g) => !childGrupoIds.has(g.id)), [allGrupos, childGrupoIds])
  const grupoChildProductIds = useMemo(() => new Set(memberships.filter((m) => m.childType === 'product').map((m) => m.childId)), [memberships])
  const standaloneProducts = useMemo(
    () => breakdownProducts.filter((b) => b.productId != null && !grupoChildProductIds.has(b.productId)),
    [breakdownProducts, grupoChildProductIds]
  )

  const linearExpectedPct = breakdown && breakdown.totalBusinessDays > 0
    ? (breakdown.elapsedBusinessDays / breakdown.totalBusinessDays) * 100
    : 0

  const chartableItems = useMemo(() => {
    const items = []
    for (const b of standaloneProducts) {
      items.push({ type: 'product', id: b.productId, label: b.product, useValue: b.useValue, series: b.series })
    }
    for (const g of rootGrupos) {
      if (g.aggregationMode !== 'sum') continue
      const series = buildGrupoSeries(g.id, allGrupos, seriesByProductId, breakdown?.totalDays)
      if (series) items.push({ type: 'grupo', id: g.id, label: g.name, useValue: true, series })
    }
    return items
  }, [standaloneProducts, rootGrupos, allGrupos, seriesByProductId, breakdown])

  useEffect(() => {
    if (chartableItems.length === 0) return
    const stillValid = chartableItems.some((i) => i.type === selected?.type && i.id === selected?.id)
    if (!stillValid) setSelected({ type: chartableItems[0].type, id: chartableItems[0].id })
  }, [chartableItems, selected])

  const selectedItem = chartableItems.find((i) => i.type === selected?.type && i.id === selected?.id) ?? null

  const hasContent = rootGrupos.length > 0 || standaloneProducts.length > 0

  if (!breakdown) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Evolução</h2>
        <div className="card text-center py-8" style={{ color: 'var(--text-muted)' }}>Carregando…</div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Evolução</h2>

      <div className="card space-y-1">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {breakdown.remainingBusinessDays > 0
            ? <>faltam <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{breakdown.remainingBusinessDays}</span> {breakdown.remainingBusinessDays === 1 ? 'dia útil' : 'dias úteis'} até o fim do mês</>
            : 'mês encerrado'}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {breakdown.elapsedBusinessDays} de {breakdown.totalBusinessDays} dias úteis decorridos · ritmo esperado: {floorPct(linearExpectedPct)}% do mês
        </p>
      </div>

      {!hasContent ? (
        <div className="card text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Nenhuma meta registrada neste mês.
        </div>
      ) : (
        <>
          {chartableItems.length > 0 && (
            <div className="card space-y-3">
              <select
                className="input w-full"
                value={selectedItem ? `${selectedItem.type}:${selectedItem.id}` : ''}
                onChange={(e) => {
                  const [type, id] = e.target.value.split(':')
                  setSelected({ type, id })
                }}
                aria-label="Produto ou grupo do gráfico"
              >
                {chartableItems.map((i) => (
                  <option key={`${i.type}:${i.id}`} value={`${i.type}:${i.id}`}>{i.label}</option>
                ))}
              </select>
              {selectedItem && <EvolucaoChart series={selectedItem.series} useValue={selectedItem.useValue} />}
            </div>
          )}

          <div className="space-y-2">
            {rootGrupos.map((g) => (
              <GrupoPaceNode key={g.id} grupoId={g.id} allGrupos={allGrupos}
                productDataMap={productDataMap} productsById={productsById}
                linearExpectedPct={linearExpectedPct} depth={0} />
            ))}
            {standaloneProducts.map((b) => (
              <ProdutoPaceCard key={b.productId} b={b} linearExpectedPct={linearExpectedPct} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
