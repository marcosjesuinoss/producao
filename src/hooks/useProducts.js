import { useMemo } from 'react'
import { useLiveQuery } from './useLiveData.js'
import { db } from '../db/db.js'

export function useProducts() {
  const dbProducts = useLiveQuery(() => db.products.orderBy('name').toArray(), [], [])

  const allProducts = useMemo(
    () => (dbProducts || []).map((p) => p.name),
    [dbProducts]
  )

  const isValue = useMemo(() => {
    const map = new Map((dbProducts || []).map((p) => [p.name, p.useValue]))
    return (name) => map.get(name) ?? true
  }, [dbProducts])

  return { allProducts, custom: dbProducts || [], isValue }
}
