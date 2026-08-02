import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Star, Target } from 'lucide-react'
import { useLiveQuery } from '../hooks/useLiveData.js'
import { db } from '../db/db.js'
import { evolucaoBreakdown } from '../lib/evolucao.js'
import { useEvolucaoFavorites } from '../hooks/useEvolucaoFavorites.js'
import { getAllDescendants } from '../utils/grupoCalculations.js'
import { brl, num, floorPct, FULL_MONTHS } from '../lib/format.js'
import EvolucaoChart from '../components/ui/EvolucaoChart.jsx'
import { useMonth } from '../context/MonthContext.jsx'

const itemKey = (item) => `${item.type}:${item.id}`

// Agrega a serie diaria de todos os produtos-folha de um grupo 'sum' e soma
// as metas deles — so faz sentido nesse modo (valores absolutos em R$).
function buildGrupoAggregate(grupoId, allGrupos, seriesByProductId, targetByProductId, totalDays) {
  if (!totalDays) return null
  const leafProducts = getAllDescendants(grupoId, allGrupos).filter((d) => d.type === 'product')
  const series = Array.from({ length: totalDays }, (_, i) => ({ day: i + 1, cumulativeActual: 0, cumulativeExpected: 0 }))
  let found = false
  let target = 0
  for (const leaf of leafProducts) {
    const prodSeries = seriesByProductId.get(leaf.refId)
    if (prodSeries) {
      found = true
      prodSeries.forEach((p, i) => {
        series[i].cumulativeExpected += p.cumulativeExpected
        series[i].cumulativeActual = p.cumulativeActual == null ? null : (series[i].cumulativeActual ?? 0) + p.cumulativeActual
      })
    }
    target += targetByProductId.get(leaf.refId) ?? 0
  }
  return found ? { series, target } : null
}

// Percorre a arvore inteira (qualquer profundidade) e lista cada grupo 'sum',
// subgrupo e produto com meta como um item selecionavel separado — ex:
// "Credito Total", "Credito > Spread" e "Credito Pessoal" aparecem os tres.
function buildChartableItems(allGrupos, breakdownProducts, totalDays) {
  const productsWithGoal = new Map(breakdownProducts.filter((b) => b.productId != null).map((b) => [b.productId, b]))
  const seriesByProductId = new Map([...productsWithGoal].map(([id, b]) => [id, b.series]))
  const targetByProductId = new Map([...productsWithGoal].map(([id, b]) => [id, b.target]))

  const childGrupoIds = new Set()
  const childProductIds = new Set()
  for (const g of allGrupos) {
    for (const child of g.children ?? []) {
      if (child.type === 'classe') childGrupoIds.add(child.refId)
      else childProductIds.add(child.refId)
    }
  }
  const rootGrupos = allGrupos.filter((g) => !childGrupoIds.has(g.id))

  const items = []
  const seen = new Set()
  const push = (item) => {
    const k = itemKey(item)
    if (seen.has(k)) return
    seen.add(k)
    items.push(item)
  }

  const visitGrupo = (grupoId) => {
    const grupo = allGrupos.find((g) => g.id === grupoId)
    if (!grupo) return
    if (grupo.aggregationMode === 'sum') {
      const agg = buildGrupoAggregate(grupoId, allGrupos, seriesByProductId, targetByProductId, totalDays)
      if (agg) push({ type: 'grupo', id: grupo.id, label: grupo.name, useValue: true, series: agg.series, target: agg.target })
    }
    for (const child of grupo.children ?? []) {
      if (child.type === 'classe') visitGrupo(child.refId)
      else {
        const b = productsWithGoal.get(child.refId)
        if (b) push({ type: 'product', id: b.productId, label: b.product, useValue: b.useValue, series: b.series, target: b.target })
      }
    }
  }
  for (const g of rootGrupos) visitGrupo(g.id)

  for (const b of productsWithGoal.values()) {
    if (!childProductIds.has(b.productId)) {
      push({ type: 'product', id: b.productId, label: b.product, useValue: b.useValue, series: b.series, target: b.target })
    }
  }

  return items
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

function ChartCard({ item, refDay, isFavorite, onToggleFavorite, reordering, onMove, isFirst, isLast }) {
  const fmt = item.useValue === false ? num : brl
  const refIndex = refDay - 1
  const refPoint = refIndex >= 0 ? item.series[refIndex] : null
  const referenceValue = refPoint?.cumulativeExpected ?? 0
  const realizedValue = refPoint?.cumulativeActual ?? 0
  const target90 = (item.target ?? 0) * 0.9

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
        <div className="flex items-center gap-1 shrink-0">
          {reordering && onMove && (
            <OrderControls
              isFirst={isFirst} isLast={isLast}
              onMoveUp={() => onMove('up')} onMoveDown={() => onMove('down')}
            />
          )}
          <button
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'Desfavoritar' : 'Favoritar'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, display: 'flex' }}
          >
            <Star size={18} strokeWidth={1.75} fill={isFavorite ? '#eab308' : 'none'} color={isFavorite ? '#eab308' : 'var(--text-faint)'} />
          </button>
        </div>
      </div>

      <EvolucaoChart series={item.series} useValue={item.useValue} referenceLine={target90} />

      <div className="flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: 'var(--c-border)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Referência até hoje</p>
          <p className="font-bold tabular-nums" style={{ fontSize: '17px', color: 'var(--text-primary)' }}>{fmt(referenceValue)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Realizado até hoje</p>
          <p className="font-bold tabular-nums" style={{ fontSize: '17px', color: 'var(--text-primary)' }}>{fmt(realizedValue)}</p>
        </div>
      </div>
    </div>
  )
}

function PickerRow({ item, isFavorite, onToggleFavorite, onSelect, active }) {
  return (
    <div
      className="flex items-center justify-between gap-2 py-2 px-2 rounded-lg cursor-pointer"
      style={{ background: active ? 'var(--btn-bg)' : 'transparent' }}
      onClick={onSelect}
    >
      <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
        aria-label={isFavorite ? 'Desfavoritar' : 'Favoritar'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, display: 'flex' }}
      >
        <Star size={18} strokeWidth={1.75} fill={isFavorite ? '#eab308' : 'none'} color={isFavorite ? '#eab308' : 'var(--text-faint)'} />
      </button>
    </div>
  )
}

// Campo de selecao personalizado: fechado mostra o item escolhido (ou um
// placeholder), clicar abre a lista completa (grupos/subgrupos/produtos)
// com estrela em cada linha pra favoritar sem precisar selecionar.
function ChartPicker({ items, isFavorite, onToggleFavorite, selectedKey, onSelect }) {
  const [open, setOpen] = useState(false)
  const selectedItem = items.find((i) => itemKey(i) === selectedKey)

  return (
    <div>
      <button
        type="button"
        className="input w-full flex items-center justify-between gap-2"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate" style={{ color: selectedItem ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {selectedItem ? selectedItem.label : 'Selecionar produto'}
        </span>
        <ChevronDown size={16} style={{
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          color: 'var(--text-faint)', flexShrink: 0,
        }} />
      </button>

      {open && (
        <div className="card space-y-0.5" style={{ marginTop: '8px' }}>
          {items.map((item) => (
            <PickerRow
              key={itemKey(item)} item={item}
              isFavorite={isFavorite(itemKey(item))}
              onToggleFavorite={() => onToggleFavorite(itemKey(item))}
              onSelect={() => { onSelect(itemKey(item)); setOpen(false) }}
              active={selectedKey === itemKey(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function EvolucaoPage() {
  const { year, month } = useMonth()
  const { favorites, isFavorite, toggleFavorite, moveFavorite } = useEvolucaoFavorites()
  const [exploringKey, setExploringKey] = useState(null)
  const [reordering, setReordering] = useState(false)

  const breakdown = useLiveQuery(() => evolucaoBreakdown({ year, month }), [year, month], null)
  const allGrupos = useLiveQuery(() => db.classes.toArray(), [], [])

  const breakdownProducts = breakdown?.products ?? []

  const chartableItems = useMemo(
    () => buildChartableItems(allGrupos, breakdownProducts, breakdown?.totalDays),
    [allGrupos, breakdownProducts, breakdown]
  )

  const favoriteItems = useMemo(
    () => favorites.map((k) => chartableItems.find((i) => itemKey(i) === k)).filter(Boolean),
    [favorites, chartableItems]
  )
  const exploringItem = chartableItems.find((i) => itemKey(i) === exploringKey) ?? null

  const linearExpectedPct = breakdown && breakdown.totalBusinessDays > 0
    ? (breakdown.elapsedBusinessDays / breakdown.totalBusinessDays) * 100
    : 0

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
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Evolução {FULL_MONTHS[month - 1]}
      </h2>

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

      {chartableItems.length === 0 ? (
        <div className="card text-center py-8 space-y-3">
          <p style={{ color: 'var(--text-muted)' }}>Nenhuma meta registrada neste mês.</p>
          <Link to="/metas" className="btn btn-brand inline-flex items-center gap-1.5" style={{ display: 'inline-flex' }}>
            <Target size={16} />
            Registrar Metas
          </Link>
        </div>
      ) : (
        <>
          {favoriteItems.map((item, idx) => (
            <ChartCard
              key={itemKey(item)} item={item} refDay={breakdown.refDay}
              isFavorite onToggleFavorite={() => toggleFavorite(itemKey(item))}
              reordering={reordering} onMove={(dir) => moveFavorite(itemKey(item), dir)}
              isFirst={idx === 0} isLast={idx === favoriteItems.length - 1}
            />
          ))}

          {favoriteItems.length > 0 && (
            <button
              className="btn w-full text-sm"
              style={reordering ? {
                background: 'rgba(99,102,241,0.12)',
                borderColor: 'rgba(99,102,241,0.4)',
                color: '#818cf8',
              } : {}}
              onClick={() => setReordering((v) => !v)}
            >
              {reordering ? 'Salvar' : 'Reordenar'}
            </button>
          )}

          <ChartPicker
            items={chartableItems}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            selectedKey={exploringKey}
            onSelect={setExploringKey}
          />

          {exploringItem && !isFavorite(itemKey(exploringItem)) && (
            <ChartCard
              item={exploringItem} refDay={breakdown.refDay}
              isFavorite={false}
              onToggleFavorite={() => toggleFavorite(itemKey(exploringItem))}
            />
          )}
        </>
      )}
    </section>
  )
}
