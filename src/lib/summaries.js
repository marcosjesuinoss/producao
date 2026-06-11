import { db } from '../db/db.js'

/*
  Queries de somatorios sobre IndexedDB (Dexie).
  Cada registro contribui com:
   - quantity (sempre)
   - value    (opcional; ignorado quando null)

  Exemplos de uso:
    monthlySummary({ year: 2026, month: 6 })
    annualSummary({ year: 2026 })
    generalSummary()
*/

function reduceTotals(records) {
  return records.reduce(
    (acc, r) => {
      acc.quantity += r.quantity || 0
      acc.value += r.value || 0
      acc.count += 1
      return acc
    },
    { quantity: 0, value: 0, count: 0 }
  )
}

// SOMATORIO MENSAL (mes vigente por padrao)
export async function monthlySummary({ year, month, product, manager } = {}) {
  const now = new Date()
  const y = Number(year) || now.getFullYear()
  const m = Number(month) || now.getMonth() + 1

  let records = await db.records.where({ year: y, month: m }).toArray()
  if (product) records = records.filter((r) => r.product === product)
  if (manager) records = records.filter((r) => r.manager === manager)

  const goals = await db.goals
    .filter((g) => g.year === y && g.month === m && (!product || g.product === product) && (!manager || g.manager === manager))
    .toArray()
  const target = goals.reduce(
    (a, g) => ({ quantity: a.quantity + (g.targetQuantity || 0), value: a.value + (g.targetValue || 0) }),
    { quantity: 0, value: 0 }
  )

  const totals = reduceTotals(records)
  return {
    period: 'monthly',
    year: y,
    month: m,
    ...totals,
    target,
    // meta realizada (%) com base na quantidade
    achievedPct: target.quantity ? Math.round((totals.quantity / target.quantity) * 100) : null,
    diff: totals.quantity - target.quantity
  }
}

// SOMATORIO ANUAL (todos os meses do ano corrente)
export async function annualSummary({ year, product, manager } = {}) {
  const y = Number(year) || new Date().getFullYear()
  let records = await db.records.where('year').equals(y).toArray()
  if (product) records = records.filter((r) => r.product === product)
  if (manager) records = records.filter((r) => r.manager === manager)

  // quebra por mes (1..12) -> usado nos graficos
  const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, quantity: 0, value: 0, target: 0 }))
  for (const r of records) {
    byMonth[r.month - 1].quantity += r.quantity || 0
    byMonth[r.month - 1].value += r.value || 0
  }
  const goals = await db.goals
    .filter((g) => g.year === y && (!product || g.product === product) && (!manager || g.manager === manager))
    .toArray()
  for (const g of goals) byMonth[g.month - 1].target += g.targetQuantity || 0

  const totals = reduceTotals(records)
  const targetTotal = goals.reduce((a, g) => a + (g.targetQuantity || 0), 0)
  return { period: 'annual', year: y, ...totals, byMonth, target: { quantity: targetTotal }, diff: totals.quantity - targetTotal }
}

// SOMATORIO GERAL (todas as producoes, todos os anos)
export async function generalSummary({ product, manager } = {}) {
  let records = await db.records.toArray()
  if (product) records = records.filter((r) => r.product === product)
  if (manager) records = records.filter((r) => r.manager === manager)
  return { period: 'general', ...reduceTotals(records) }
}

// Agregacao por produto para o mes vigente (grafico por produto)
export async function productBreakdown({ year, month, manager } = {}) {
  const now = new Date()
  const y = Number(year) || now.getFullYear()
  const m = Number(month) || now.getMonth() + 1
  let records = await db.records.where({ year: y, month: m }).toArray()
  if (manager) records = records.filter((r) => r.manager === manager)

  const map = new Map()
  for (const r of records) {
    const cur = map.get(r.product) || { product: r.product, quantity: 0, value: 0, target: 0 }
    cur.quantity += r.quantity || 0
    cur.value += r.value || 0
    map.set(r.product, cur)
  }
  const goals = await db.goals.filter((g) => g.year === y && g.month === m && (!manager || g.manager === manager)).toArray()
  for (const g of goals) {
    const cur = map.get(g.product) || { product: g.product, quantity: 0, value: 0, target: 0 }
    cur.target += g.targetQuantity || 0
    map.set(g.product, cur)
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity)
}
