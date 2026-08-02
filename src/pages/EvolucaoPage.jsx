import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from '../hooks/useLiveData.js'
import { db } from '../db/db.js'
import { evolucaoBreakdown } from '../lib/evolucao.js'
import { deriveMemberships, getAllDescendants } from '../utils/grupoCalculations.js'
import { brl, num, floorPct } from '../lib/format.js'
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

export default function EvolucaoPage() {
  const { year, month } = useMonth()
  const [selected, setSelected] = useState(null) // { type: 'product'|'grupo', id }

  const breakdown = useLiveQuery(() => evolucaoBreakdown({ year, month }), [year, month], null)
  const allGrupos = useLiveQuery(() => db.classes.toArray(), [], [])

  const breakdownProducts = breakdown?.products ?? []

  const seriesByProductId = useMemo(() => {
    const map = new Map()
    for (const b of breakdownProducts) if (b.productId != null) map.set(b.productId, b.series)
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

  const linearExpectedPct = breakdown && breakdown.totalBusinessDays > 0
    ? (breakdown.elapsedBusinessDays / breakdown.totalBusinessDays) * 100
    : 0

  const refIndex = (breakdown?.refDay ?? 0) - 1
  const refPoint = selectedItem && refIndex >= 0 ? selectedItem.series[refIndex] : null
  const referenceValue = refPoint?.cumulativeExpected ?? 0
  const realizedValue = refPoint?.cumulativeActual ?? 0
  const fmt = selectedItem?.useValue === false ? num : brl

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

      {chartableItems.length === 0 ? (
        <div className="card text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Nenhuma meta registrada neste mês.
        </div>
      ) : (
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

          {selectedItem && (
            <>
              <EvolucaoChart series={selectedItem.series} useValue={selectedItem.useValue} />

              <div
                className="flex items-center justify-between gap-2 pt-3 border-t"
                style={{ borderColor: 'var(--c-border)' }}
              >
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Referência até hoje</p>
                  <p className="font-bold tabular-nums" style={{ fontSize: '17px', color: 'var(--text-primary)' }}>
                    {fmt(referenceValue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Realizado até hoje</p>
                  <p className="font-bold tabular-nums" style={{ fontSize: '17px', color: 'var(--text-primary)' }}>
                    {fmt(realizedValue)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
