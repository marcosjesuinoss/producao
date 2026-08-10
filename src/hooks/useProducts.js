import { useMemo } from 'react'
import { useLiveQuery } from './useLiveData.js'
import { db } from '../db/db.js'

export function useProducts() {
  const dbProducts = useLiveQuery(() => db.products.orderBy('name').toArray(), [], [])

  // Produtos arquivados (ja tem lancamentos, mas foram "excluidos" — ver
  // deleteProduct em localApi.js) ficam fora de allProducts: nao aparecem
  // pra escolher em novo registro/meta, mas os dados deles continuam
  // intactos e visiveis nos relatorios.
  const activeProducts = useMemo(
    () => (dbProducts || []).filter((p) => !p.archived),
    [dbProducts]
  )
  const archivedProducts = useMemo(
    () => (dbProducts || []).filter((p) => p.archived),
    [dbProducts]
  )

  const allProducts = useMemo(
    () => activeProducts.map((p) => p.name),
    [activeProducts]
  )

  const isValue = useMemo(() => {
    const map = new Map((dbProducts || []).map((p) => [p.name, p.useValue]))
    return (name) => map.get(name) ?? true
  }, [dbProducts])

  return { allProducts, archivedProducts, custom: dbProducts || [], isValue }
}
