import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from '../hooks/useLiveData.js'
import { AlertTriangle, Check, ChevronRight, Lock } from 'lucide-react'
import { db } from '../db/db.js'
import { accumulatedBreakdown } from '../lib/summaries.js'
import { saveYearSnapshot } from '../api/localApi.js'
import { brl, num, MONTHS, floorPct } from '../lib/format.js'
import { getProgressColor, getRemainingLabel } from '../utils/progressColor.js'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import { computeGrupoProgress, deriveMemberships } from '../utils/grupoCalculations.js'
import ViewRecordsButton from '../components/ViewRecordsButton.jsx'

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

function getAvailablePeriods() {
  const now = new Date()
  const cy  = now.getFullYear()
  const cm  = now.getMonth() + 1
  const periods = []

  periods.push({ value: `anual-${cy}`, label: `Anual ${cy}`,        year: cy, type: 'anual' })
  periods.push({ value: `sem1-${cy}`,  label: `1º Semestre ${cy}`,  year: cy, type: 'sem1'  })
  if (cm >= 7) {
    periods.push({ value: `sem2-${cy}`, label: `2º Semestre ${cy}`, year: cy, type: 'sem2'  })
  }

  if (cm <= 3) {
    const py = cy - 1
    periods.push({ value: `anual-${py}`, label: `Anual ${py}`,        year: py, type: 'anual' })
    periods.push({ value: `sem1-${py}`,  label: `1º Semestre ${py}`,  year: py, type: 'sem1'  })
    periods.push({ value: `sem2-${py}`,  label: `2º Semestre ${py}`,  year: py, type: 'sem2'  })
  }

  return periods
}

function resolvePeriod(type, year) {
  const now = new Date()
  const cy  = now.getFullYear()
  const cm  = now.getMonth() + 1
  const isCurrent = year === cy
  if (type === 'anual') return { startMonth: 1, endMonth: isCurrent ? cm : 12 }
  if (type === 'sem1')  return { startMonth: 1, endMonth: isCurrent ? Math.min(cm, 6) : 6 }
  if (type === 'sem2')  return { startMonth: 7, endMonth: isCurrent ? Math.min(cm, 12) : 12 }
  return { startMonth: 1, endMonth: cm }
}

function buildSubtitle(type, year, startMonth, endMonth) {
  const now = new Date()
  const isCurrent = year === now.getFullYear()
  const cm        = now.getMonth() + 1
  const start     = MONTHS[startMonth - 1]
  const labelEnd  = type === 'anual' ? 12 : endMonth
  const end       = MONTHS[labelEnd - 1]
  const n         = labelEnd - startMonth + 1
  const range     = startMonth === endMonth ? start : `${start} a ${end}`
  const status    = isCurrent && endMonth >= cm ? 'em andamento' : 'concluído'
  return `${range} ${year} · ${n} ${n === 1 ? 'mês' : 'meses'} · ${status}`
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

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
// ProductLeaf — filho de GrupoNode
// ---------------------------------------------------------------------------

function ProductLeaf({ name, realized, target, useValue, depth, year, startMonth, endMonth }) {
  const fmt    = useValue ? brl : num
  const rawPct = target > 0 ? (realized / target) * 100 : realized > 0 ? 100 : 0
  const pct    = target > 0 ? floorPct(rawPct) : realized > 0 ? 100 : null
  const color  = pct != null ? getProgressColor(rawPct) : '#374151'
  const nodeStyle = depth === 1
    ? { borderLeft: `2px solid ${color}`, paddingLeft: '8px', marginLeft: '2px' }
    : { borderLeft: '2px solid rgba(99,102,241,0.2)', paddingLeft: '12px', marginLeft: '8px' }

  return (
    <div style={nodeStyle} className="space-y-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate"
          style={{ fontWeight: depth === 1 ? 500 : 400, fontSize: depth === 1 ? '13px' : '12px', color: 'var(--text-secondary)' }}>
          {name}
        </span>
        <ViewRecordsButton product={name} year={year} startMonth={startMonth} endMonth={endMonth} />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="font-bold tabular-nums"
            style={{ fontSize: depth === 1 ? '15px' : '13px', color: 'var(--text-primary)' }}>
            {fmt(realized)}
          </span>
          {target > 0 && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{' / '}{fmt(target)}</span>}
        </div>
        {pct != null && <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color }}>{pct}%</span>}
      </div>
      <ProgressBar value={realized} max={target} height={depth === 1 ? 4 : 3} />
      <RemainingLine value={realized} target={target} fmt={fmt} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// GrupoNode — renderização recursiva
// ---------------------------------------------------------------------------

function GrupoNode({ grupoId, allGrupos, productDataMap, productById, depth = 0, year, startMonth, endMonth }) {
  const [open, setOpen] = useState(true)

  const grupo = allGrupos.find((g) => g.id === grupoId)
  if (!grupo) return null

  const children    = grupo.children ?? []
  const hasChildren = children.length > 0
  const isAvgPct    = grupo.aggregationMode === 'average_pct'

  const { realized, target, pct: rawPct } = computeGrupoProgress(grupoId, allGrupos, productDataMap)
  const pct = isAvgPct
    ? (rawPct > 0 ? floorPct(rawPct) : null)
    : (target ?? 0) > 0
      ? floorPct(rawPct)
      : (realized ?? 0) > 0 ? 100 : null
  const color = pct != null ? getProgressColor(rawPct) : '#374151'

  const nodeStyle = depth === 0 ? {} : depth === 1
    ? { borderLeft: `2px solid ${color}`, paddingLeft: '8px', marginLeft: '2px' }
    : { borderLeft: '2px solid rgba(99,102,241,0.2)', paddingLeft: '12px', marginLeft: '8px' }

  const labelSize   = depth === 0 ? '14px' : depth === 1 ? '13px' : '12px'
  const labelWeight = depth === 0 ? 600    : depth === 1 ? 500    : 400
  const valueSize   = depth === 0 ? '20px' : depth === 1 ? '15px' : '13px'

  const inner = (
    <div style={depth > 0 ? nodeStyle : {}} className="space-y-1">
      <div
        className="flex items-center justify-between gap-2"
        onClick={hasChildren ? () => setOpen((o) => !o) : undefined}
        style={hasChildren ? { cursor: 'pointer', userSelect: 'none' } : {}}
        aria-expanded={hasChildren ? open : undefined}
      >
        <span className="truncate"
          style={{ fontWeight: labelWeight, fontSize: labelSize, color: 'var(--text-secondary)' }}>
          {grupo.name}
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
            {!hasChildren ? 'sem itens' : `média entre ${children.length} itens`}
          </span>
          {pct != null && pct > 0 && (
            <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color }}>{pct}%</span>
          )}
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <span className="font-bold tabular-nums"
              style={{ fontSize: valueSize, color: 'var(--text-primary)' }}>
              {brl(realized ?? 0)}
            </span>
            {(target ?? 0) > 0 && (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{' / '}{brl(target)}</span>
            )}
          </div>
          {pct != null && (
            <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color }}>{pct}%</span>
          )}
        </div>
      )}

      <ProgressBar
        value={isAvgPct ? rawPct : (realized ?? 0)}
        max={isAvgPct ? 100 : (target ?? 0)}
        height={depth === 0 ? 5 : depth === 1 ? 4 : 3}
      />

      {!isAvgPct && (
        <RemainingLine
          value={realized ?? 0}
          target={target ?? 0}
          fmt={brl}
          fontSize={depth === 0 ? '12px' : '11px'}
        />
      )}

      {hasChildren && open && (
        <div
          className={depth === 0 ? 'mt-3 pt-3 border-t space-y-3' : 'mt-3 space-y-2'}
          style={depth === 0 ? { borderColor: 'var(--c-border)' } : {}}
        >
          {children.map((child) => {
            if (child.type === 'classe') {
              return (
                <GrupoNode key={child.refId} grupoId={child.refId}
                  allGrupos={allGrupos} productDataMap={productDataMap}
                  productById={productById} depth={depth + 1}
                  year={year} startMonth={startMonth} endMonth={endMonth} />
              )
            }
            const prod = productById.get(child.refId)
            const data = productDataMap.get(child.refId) || { realized: 0, target: 0 }
            return (
              <ProductLeaf key={child.refId}
                name={prod?.name ?? '(removido)'}
                realized={data.realized} target={data.target}
                useValue={prod?.useValue ?? true} depth={depth + 1}
                year={year} startMonth={startMonth} endMonth={endMonth} />
            )
          })}
        </div>
      )}
    </div>
  )

  if (depth === 0) return <div className="card space-y-1">{inner}</div>
  return inner
}

// ---------------------------------------------------------------------------
// ProductCard — produto sem grupo
// ---------------------------------------------------------------------------

function ProductCard({ b, year, startMonth, endMonth }) {
  const rawPct = b.metricTarget > 0 ? (b.realized / b.metricTarget) * 100 : b.realized > 0 ? 100 : 0
  const pct    = b.metricTarget > 0 ? floorPct(rawPct) : b.realized > 0 ? 100 : null
  const color  = pct != null ? getProgressColor(rawPct) : 'var(--text-faint)'
  const fmt    = (v) => (b.useValue ? brl(v) : num(v))

  return (
    <div className="card space-y-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
          {b.product}
        </span>
        <ViewRecordsButton product={b.product} year={year} startMonth={startMonth} endMonth={endMonth} />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(b.realized)}</span>
          {b.metricTarget > 0 && (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}> / {fmt(b.metricTarget)}</span>
          )}
        </div>
        {pct != null && <span className="text-sm font-bold shrink-0" style={{ color }}>{pct}%</span>}
      </div>
      {b.useValue && b.quantity > 0 && (
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{num(b.quantity)} operação(ões)</div>
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

export default function AcumuladoPage() {
  const PERIODS = useMemo(() => getAvailablePeriods(), [])
  const [selectedValue, setSelectedValue] = useState(PERIODS[0].value)
  const [saving, setSaving] = useState(false)
  const [breakdown, setBreakdown] = useState([])

  const selected = useMemo(
    () => PERIODS.find((p) => p.value === selectedValue) ?? PERIODS[0],
    [PERIODS, selectedValue]
  )
  const { startMonth, endMonth } = useMemo(
    () => resolvePeriod(selected.type, selected.year),
    [selected]
  )

  const currentYear = new Date().getFullYear()
  const isPastYear  = selected.year < currentYear

  const tick = useLiveQuery(
    async () => (await db.records.count()) + (await db.goals.count()),
    [], 0
  )
  const allGrupos   = useLiveQuery(() => db.classes.toArray(),  [], [])
  const allProducts = useLiveQuery(() => db.products.toArray(), [], [])

  // Snapshot do ano selecionado (undefined=carregando, null=não existe, obj=existe)
  const snapshot = useLiveQuery(
    () => isPastYear
      ? db.yearSnapshots.where('year').equals(selected.year).first()
      : Promise.resolve(null),
    [selected.year, isPastYear]
  )

  // Para anos passados: usa grupos do snapshot se existir, senão usa grupos atuais
  const effectiveGrupos = useMemo(
    () => isPastYear && snapshot?.grupos ? snapshot.grupos : (allGrupos ?? []),
    [isPastYear, snapshot, allGrupos]
  )

  const handleSaveSnapshot = async () => {
    setSaving(true)
    try { await saveYearSnapshot(selected.year) }
    finally { setSaving(false) }
  }

  useEffect(() => {
    let alive = true
    accumulatedBreakdown({ year: selected.year, startMonth, endMonth }).then((data) => {
      if (alive) setBreakdown(data)
    })
    return () => { alive = false }
  }, [tick, selected.year, startMonth, endMonth])

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
    () => deriveMemberships(effectiveGrupos),
    [effectiveGrupos]
  )
  const childGrupoIds = useMemo(
    () => new Set(memberships.filter((m) => m.childType === 'classe').map((m) => m.childId)),
    [memberships]
  )
  const rootGrupos = useMemo(
    () => effectiveGrupos.filter((g) => !childGrupoIds.has(g.id)),
    [effectiveGrupos, childGrupoIds]
  )
  const grupoChildProductIds = useMemo(
    () => new Set(memberships.filter((m) => m.childType === 'product').map((m) => m.childId)),
    [memberships]
  )
  const standaloneBreakdown = useMemo(
    () => breakdown.filter((b) => {
      const prod = productsByName.get(b.product)
      return prod && !grupoChildProductIds.has(prod.id) && (b.realized > 0 || b.metricTarget > 0)
    }),
    [breakdown, productsByName, grupoChildProductIds]
  )

  const subtitle      = buildSubtitle(selected.type, selected.year, startMonth, endMonth)
  const hasContent    = rootGrupos.length > 0 || standaloneBreakdown.length > 0
  // snapshot === undefined → ainda carregando; null → não existe; obj → existe
  const snapshotReady = !isPastYear || snapshot !== undefined
  const hasSnapshot   = isPastYear && !!snapshot

  return (
    <section className="space-y-4">
      {/* Seletor de período */}
      <select
        className="input w-full"
        value={selectedValue}
        onChange={(e) => setSelectedValue(e.target.value)}
        aria-label="Período acumulado"
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Legenda do período */}
      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        {subtitle}
      </p>

      {/* Banner: ano passado SEM snapshot */}
      {isPastYear && snapshotReady && !hasSnapshot && (
        <div
          className="card space-y-2"
          style={{ background: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.3)' }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div className="space-y-0.5">
              <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                Estrutura de grupos de {selected.year} não está preservada
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Alterações nos grupos afetarão esta visão retroativamente.
              </p>
            </div>
          </div>
          <button
            className="btn btn-brand text-xs w-full"
            onClick={handleSaveSnapshot}
            disabled={saving}
          >
            {saving ? 'Salvando…' : `Salvar estrutura de grupos de ${selected.year}`}
          </button>
        </div>
      )}

      {/* Indicador: ano passado COM snapshot */}
      {isPastYear && hasSnapshot && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Lock size={12} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Grupos de {selected.year} preservados
            </span>
          </div>
          <button
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '11px', color: 'var(--text-faint)', textDecoration: 'underline',
            }}
            onClick={handleSaveSnapshot}
            disabled={saving}
          >
            {saving ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      )}

      {/* Cards */}
      {!hasContent ? (
        <div className="card text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Nenhuma produção ou meta registrada neste período.
        </div>
      ) : (
        <div className="space-y-2">
          {rootGrupos.map((grp) => (
            <GrupoNode
              key={grp.id}
              grupoId={grp.id}
              allGrupos={effectiveGrupos}
              productDataMap={productDataMap}
              productById={productById}
              depth={0}
              year={selected.year}
              startMonth={startMonth}
              endMonth={endMonth}
            />
          ))}
          {standaloneBreakdown.map((b) => (
            <ProductCard key={b.product} b={b} year={selected.year} startMonth={startMonth} endMonth={endMonth} />
          ))}
        </div>
      )}
    </section>
  )
}
