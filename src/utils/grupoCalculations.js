/**
 * Calculation and validation utilities for "Grupos" (configurable goal groupings).
 *
 * A Grupo stores:
 *   { id, name, aggregationMode: 'sum' | 'average_pct', children: [{ type: 'product'|'classe', refId }] }
 *   Note: children use type 'classe' (stored in IndexedDB) — this is an internal
 *   storage detail; the user-facing name is "grupo".
 *
 * productDataMap: Map<productId, { realized: number, target: number }>
 *   — built per-month by the caller from records/goals data.
 */

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Recursively computes progress for a grupo.
 * Returns { realized, target, pct } for 'sum' mode.
 * Returns { realized: null, target: null, pct } for 'average_pct' mode.
 */
export function computeGrupoProgress(grupoId, allGrupos, productDataMap) {
  const grupo = allGrupos.find((g) => g.id === grupoId)
  if (!grupo) return { realized: 0, target: 0, pct: 0 }

  const childResults = (grupo.children || []).map((child) => {
    if (child.type === 'product') {
      const data = productDataMap.get(child.refId) || { realized: 0, target: 0 }
      const pct = data.target > 0 ? (data.realized / data.target) * 100 : 0
      return { realized: data.realized, target: data.target, pct }
    }
    // nested grupo — recurse (stored as type 'classe' in DB)
    return computeGrupoProgress(child.refId, allGrupos, productDataMap)
  })

  if (grupo.aggregationMode === 'sum') {
    const realized = childResults.reduce((s, r) => s + (r.realized ?? 0), 0)
    const target   = childResults.reduce((s, r) => s + (r.target   ?? 0), 0)
    const pct      = target > 0 ? (realized / target) * 100 : 0
    return { realized, target, pct }
  }

  if (grupo.aggregationMode === 'average_pct') {
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
 * Derives a flat list of { childType, childId, grupoId } from the grupos array.
 * Used by conflict and depth checks without an extra round-trip to the DB.
 */
export function deriveMemberships(allGrupos) {
  const memberships = []
  for (const grp of allGrupos) {
    for (const child of (grp.children || [])) {
      memberships.push({ childType: child.type, childId: child.refId, grupoId: grp.id })
    }
  }
  return memberships
}

// ---------------------------------------------------------------------------
// Conflict / ancestor validation
// ---------------------------------------------------------------------------

/**
 * Returns all ancestor grupoIds (direct parents + their ancestors, deduplicated).
 */
export function getAllAncestors(childType, childId, memberships) {
  const directParents = memberships
    .filter((m) => m.childType === childType && m.childId === childId)
    .map((m) => m.grupoId)

  let all = [...directParents]
  for (const parentId of directParents) {
    all = all.concat(getAllAncestors('classe', parentId, memberships))
  }
  return [...new Set(all)]
}

/**
 * Returns all recursive descendants of grupoId as { type, refId }[].
 * Traverses both 'product' and 'classe' children.
 */
export function getAllDescendants(grupoId, allGrupos) {
  const result = []
  const seen = new Set()
  const stack = [grupoId]
  while (stack.length) {
    const id = stack.pop()
    if (seen.has(id)) continue
    seen.add(id)
    const grp = allGrupos.find((g) => g.id === id)
    if (!grp) continue
    for (const child of grp.children ?? []) {
      result.push({ type: child.type, refId: child.refId })
      if (child.type === 'classe') stack.push(child.refId)
    }
  }
  return result
}

/**
 * Returns true if adding childType/childId as a child of targetGrupoId
 * would create a shared-ancestor conflict (double-counting risk).
 */
export function wouldCreateConflict(childType, childId, targetGrupoId, memberships) {
  const targetAncestors = new Set([
    targetGrupoId,
    ...getAllAncestors('classe', targetGrupoId, memberships),
  ])
  const childAncestors = getAllAncestors(childType, childId, memberships)
  return childAncestors.some((a) => targetAncestors.has(a))
}

// ---------------------------------------------------------------------------
// Depth validation (max 3 levels)
// ---------------------------------------------------------------------------

/**
 * Returns the depth of grupoId's position in the hierarchy (1 = root, no parents).
 * A grupo with multiple parents takes the deepest position.
 */
export function getDepth(grupoId, memberships) {
  const directParents = memberships
    .filter((m) => m.childType === 'classe' && m.childId === grupoId)
    .map((m) => m.grupoId)

  if (directParents.length === 0) return 1
  return 1 + Math.max(...directParents.map((p) => getDepth(p, memberships)))
}

/**
 * Returns the depth of the subtree rooted at grupoId (1 = leaf grupo, no child grupos).
 */
function getSubtreeDepth(grupoId, allGrupos) {
  const grupo = allGrupos.find((g) => g.id === grupoId)
  if (!grupo) return 1

  const childGrupoDepths = (grupo.children || [])
    .filter((c) => c.type === 'classe')
    .map((c) => getSubtreeDepth(c.refId, allGrupos))

  if (childGrupoDepths.length === 0) return 1
  return 1 + Math.max(...childGrupoDepths)
}

/**
 * Returns true if adding childGrupoId as a child of targetGrupoId
 * would exceed MAX_DEPTH (default 3) levels of nesting.
 */
export function wouldExceedMaxDepth(childGrupoId, targetGrupoId, allGrupos, memberships, MAX_DEPTH = 3) {
  const targetDepth  = getDepth(targetGrupoId, memberships)
  const subtreeDepth = getSubtreeDepth(childGrupoId, allGrupos)
  return (targetDepth + subtreeDepth) > MAX_DEPTH
}
