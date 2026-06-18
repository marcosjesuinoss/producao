import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { PRODUCTS, VALUE_PRODUCTS, CREDIT_GROUPS } from '../lib/format.js'

/**
 * Retorna todos os produtos (estáticos + customizados) e uma função isValue(name).
 * isValue(name) → true = alvo é valor (R$), false = alvo é quantidade.
 */
export function useProducts() {
  const custom = useLiveQuery(() => db.products.orderBy('name').toArray(), [], [])

  const allProducts = useMemo(() => {
    const customNames = new Set((custom || []).map((p) => p.name))
    const merged = [
      ...PRODUCTS.filter((p) => !customNames.has(p)),
      ...(custom || []).map((p) => p.name),
    ]
    return merged.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [custom])

  const isValue = useMemo(() => {
    const map = new Map(PRODUCTS.map((p) => [p, VALUE_PRODUCTS.has(p)]))
    for (const group of CREDIT_GROUPS) map.set(group, true)
    for (const p of (custom || [])) map.set(p.name, p.useValue)
    return (name) => map.get(name) ?? true
  }, [custom])

  return { allProducts, custom: custom || [], isValue }
}
