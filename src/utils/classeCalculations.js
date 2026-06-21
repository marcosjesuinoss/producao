/**
 * Calculation and validation utilities for "Classes" (configurable goal groupings).
 *
 * A Classe stores:
 *   { id, name, aggregationMode: 'sum' | 'average_pct', children: [{ type: 'product'|'classe', refId }] }
 *
 * productDataMap: Map<productId, { realized: number, target: number }>
 *   — built per-month by the caller from records/goals data.
 */

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Recursively computes progress for a classe.
 * Returns { realized, target, pct } for 'sum' mode.
 * Returns { realized: null, target: null, pct } for 'average_pct' mode.
 */
export function computeClasseProgress(classeId, allClasses, productDataMap) {
  const classe = allClasses.find((c) => c.id === classeId)
  if (!classe) return { realized: 0, target: 0, pct: 0 }

  const childResults = (classe.children || []).map((child) => {
    if (child.type === 'product') {
      const data = productDataMap.get(child.refId) || { realized: 0, target: 0 }
      const pct = data.target > 0 ? (data.realized / data.target) * 100 : 0
      return { realized: data.realized, target: data.target, pct }
    }
    // nested classe — recurse
    return computeClasseProgress(child.refId, allClasses, productDataMap)
  })

  if (classe.aggregationMode === 'sum') {
    const realized = childResults.reduce((s, r) => s + (r.realized ?? 0), 0)
    const target   = childResults.reduce((s, r) => s + (r.target   ?? 0), 0)
    const pct      = target > 0 ? (realized / target) * 100 : 0
    return { realized, target, pct }
  }

  if (classe.aggregationMode === 'average_pct') {
    const avgPct = childResults.length > 0
      ? childResults.reduce((s, r) => s + Math.min(r.pct, 100), 0) / childResults.length
      : 0
    return { pct: avgPct, realized: null, target: null }
  }

  return { realized: 0, target: 0, pct: 0 }
}

// ---------------------------------------------------------------------------
// Membership derivation (avoids a separate DB table)
// ---------------------------------------------------------------------------

/**
 * Derives a flat list of { childType, childId, classeId } from the classes array.
 * Used by conflict and depth checks without an extra round-trip to the DB.
 */
export function deriveMemberships(allClasses) {
  const memberships = []
  for (const cls of allClasses) {
    for (const child of (cls.children || [])) {
      memberships.push({ childType: child.type, childId: child.refId, classeId: cls.id })
    }
  }
  return memberships
}

// ---------------------------------------------------------------------------
// Conflict / ancestor validation
// ---------------------------------------------------------------------------

/**
 * Returns all ancestor classeIds (direct parents + their ancestors, deduplicated).
 */
export function getAllAncestors(childType, childId, memberships) {
  const directParents = memberships
    .filter((m) => m.childType === childType && m.childId === childId)
    .map((m) => m.classeId)

  let all = [...directParents]
  for (const parentId of directParents) {
    all = all.concat(getAllAncestors('classe', parentId, memberships))
  }
  return [...new Set(all)]
}

/**
 * Returns true if adding childType/childId as a child of targetClasseId
 * would create a shared-ancestor conflict (double-counting risk).
 */
export function wouldCreateConflict(childType, childId, targetClasseId, memberships) {
  const targetAncestors = new Set([
    targetClasseId,
    ...getAllAncestors('classe', targetClasseId, memberships),
  ])
  const childAncestors = getAllAncestors(childType, childId, memberships)
  return childAncestors.some((a) => targetAncestors.has(a))
}

// ---------------------------------------------------------------------------
// Depth validation (max 3 levels)
// ---------------------------------------------------------------------------

/**
 * Returns the depth of classeId's position in the hierarchy (1 = root, no parents).
 * A classe with multiple parents takes the deepest position.
 */
export function getDepth(classeId, memberships) {
  const directParents = memberships
    .filter((m) => m.childType === 'classe' && m.childId === classeId)
    .map((m) => m.classeId)

  if (directParents.length === 0) return 1
  return 1 + Math.max(...directParents.map((p) => getDepth(p, memberships)))
}

/**
 * Returns the depth of the subtree rooted at classeId (1 = leaf classe, no child classes).
 */
function getSubtreeDepth(classeId, allClasses) {
  const classe = allClasses.find((c) => c.id === classeId)
  if (!classe) return 1

  const childClasseDepths = (classe.children || [])
    .filter((c) => c.type === 'classe')
    .map((c) => getSubtreeDepth(c.refId, allClasses))

  if (childClasseDepths.length === 0) return 1
  return 1 + Math.max(...childClasseDepths)
}

/**
 * Returns true if adding childClasseId as a child of targetClasseId
 * would exceed MAX_DEPTH (default 3) levels of nesting.
 */
export function wouldExceedMaxDepth(childClasseId, targetClasseId, allClasses, memberships, MAX_DEPTH = 3) {
  const targetDepth    = getDepth(targetClasseId, memberships)
  const subtreeDepth   = getSubtreeDepth(childClasseId, allClasses)
  return (targetDepth + subtreeDepth) > MAX_DEPTH
}

// ---------------------------------------------------------------------------
// Dev validation helper (call from browser console)
// ---------------------------------------------------------------------------

/**
 * Validates seed data and calculation correctness.
 * Usage from browser console:
 *   import('/src/utils/classeCalculations.js').then(m => m.runValidationTest(2026, 6))
 * Or expose via window in main.jsx for quick access.
 */
export async function runValidationTest(year, month) {
  const { db } = await import('../db/db.js')

  const allClasses = await db.classes.toArray()
  const allProducts = await db.products.toArray()
  const records = await db.records.where({ year: Number(year), month: Number(month) }).toArray()
  const goals = await db.goals
    .filter((g) => g.year === Number(year) && g.month === Number(month))
    .toArray()

  if (!allClasses.length) {
    console.error('[classeCalc] No classes in DB — seed may not have run yet.')
    return
  }

  // Build realized/target by product name
  const realizedByName = {}
  for (const r of records) {
    if (r.value != null) realizedByName[r.product] = (realizedByName[r.product] || 0) + r.value
  }
  const targetByName = {}
  for (const g of goals) {
    if (g.targetValue != null) targetByName[g.product] = (targetByName[g.product] || 0) + g.targetValue
  }

  // productDataMap: Map<productId, { realized, target }>
  const productDataMap = new Map()
  for (const p of allProducts) {
    productDataMap.set(p.id, {
      realized: realizedByName[p.name] || 0,
      target:   targetByName[p.name]   || 0,
    })
  }

  const creditTotal = allClasses.find((c) => c.name === 'Credito Total')
  if (!creditTotal) {
    console.error('[classeCalc] "Credito Total" classe not found in DB.')
    return
  }

  const result = computeClasseProgress(creditTotal.id, allClasses, productDataMap)
  console.log('[classeCalc] Credito Total →', result)
  console.log('  realized:', result.realized?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
  console.log('  target  :', result.target?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
  console.log('  pct     :', Math.round(result.pct) + '%')

  // Conflict tests
  const memberships = deriveMemberships(allClasses)
  const idByName = new Map(allProducts.map((p) => [p.name, p.id]))

  const creditMenor  = allClasses.find((c) => c.name === 'Credito < Spread')
  const pessoalId    = idByName.get('Credito Pessoal')
  const capitalId    = idByName.get('Capitalizacao - Mensal')

  const conflict1 = wouldCreateConflict('product', pessoalId, creditMenor.id, memberships)
  const conflict2 = wouldCreateConflict('product', capitalId, creditMenor.id, memberships)

  console.log('[classeCalc] Conflict: Credito Pessoal → Credito < Spread (expect TRUE ):', conflict1)
  console.log('[classeCalc] Conflict: Capitalizacao   → Credito < Spread (expect FALSE):', conflict2)

  console.assert(conflict1 === true,  'FAIL: expected conflict for Credito Pessoal')
  console.assert(conflict2 === false, 'FAIL: expected no conflict for Capitalizacao')
  console.log('[classeCalc] Validation complete.')
}
