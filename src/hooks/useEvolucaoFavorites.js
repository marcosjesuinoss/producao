import { useCallback, useState } from 'react'

const KEY = 'evolucao_favorites'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

// Favoritos da tela Evolução — guarda so as chaves "tipo:id" (produto ou
// grupo), persistidas no aparelho (localStorage), pra reaparecer sempre
// que a aba for aberta, sem precisar re-selecionar toda vez.
export function useEvolucaoFavorites() {
  const [favorites, setFavorites] = useState(load)

  const isFavorite = useCallback((key) => favorites.includes(key), [favorites])

  const toggleFavorite = useCallback((key) => {
    setFavorites((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  // Reordena os favoritos entre si (a ordem de exibicao e a propria ordem
  // do array, ja persistida) — mesmo padrao de swap do useDisplayOrder.
  const moveFavorite = useCallback((key, dir) => {
    setFavorites((prev) => {
      const idx = prev.indexOf(key)
      const swap = dir === 'up' ? idx - 1 : idx + 1
      if (idx < 0 || swap < 0 || swap >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { favorites, isFavorite, toggleFavorite, moveFavorite }
}
