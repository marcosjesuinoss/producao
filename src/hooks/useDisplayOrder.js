import { useCallback, useState } from 'react'

const KEY = 'home_display_order'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export function useDisplayOrder() {
  const [order, setOrder] = useState(load)

  // Returns `ids` sorted by stored order; unknown IDs go to the end.
  const getSorted = useCallback((ids) => {
    const set = new Set(ids)
    const stored = order.filter((id) => set.has(id))
    const extra = ids.filter((id) => !order.includes(id))
    return [...stored, ...extra]
  }, [order])

  // Moves `id` up or down within `ids` (already sorted by getSorted).
  const move = useCallback((id, ids, dir) => {
    const idx = ids.indexOf(id)
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swap < 0 || swap >= ids.length) return
    const next = [...ids]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    localStorage.setItem(KEY, JSON.stringify(next))
    setOrder(next)
  }, [])

  return { getSorted, move }
}
