import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { CREDIT_GROUPS } from '../lib/format.js'

/**
 * Retorna todos os produtos do DB (padrão + criados pelo usuário)
 * e uma função isValue(name).
 * CREDIT_GROUPS são virtuais (nunca no DB) e sempre retornam isValue=true.
 */
export function useProducts() {
  const dbProducts = useLiveQuery(() => db.products.orderBy('name').toArray(), [], [])

  const allProducts = useMemo(
    () => (dbProducts || []).map((p) => p.name),
    [dbProducts]
  )

  const isValue = useMemo(() => {
    const map = new Map((dbProducts || []).map((p) => [p.name, p.useValue]))
    for (const group of CREDIT_GROUPS) map.set(group, true)
    return (name) => map.get(name) ?? true
  }, [dbProducts])

  return { allProducts, custom: dbProducts || [], isValue }
}
