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
  // `ids` normalmente e so o subconjunto VISIVEL (ex.: "Mostrar zerados"
  // desligado esconde produtos zerados) — por isso a troca acontece sobre o
  // `order` completo salvo, nao sobre `ids`: assim itens ocultos no momento
  // mantem a posicao guardada em vez de serem descartados do arquivo salvo.
  const move = useCallback((id, ids, dir) => {
    const idx = ids.indexOf(id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swapIdx < 0 || swapIdx >= ids.length) return
    const swapId = ids[swapIdx]

    setOrder((prev) => {
      const known = new Set(prev)
      const full = [...prev, ...ids.filter((k) => !known.has(k))]
      const a = full.indexOf(id)
      const b = full.indexOf(swapId)
      const next = [...full]
      ;[next[a], next[b]] = [next[b], next[a]]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { getSorted, move }
}
