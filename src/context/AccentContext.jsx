import { createContext, useContext, useEffect, useState } from 'react'
import { ACCENTS, DEFAULT_ACCENT, resolveAccentTones } from '../lib/accents.js'
import { useTheme } from './ThemeContext.jsx'

const AccentContext = createContext(null)
const STORAGE_KEY = 'accent'

// Depende do tema atual (useTheme) — os tons resolvidos mudam conforme
// cor escolhida X tema ativo, entao esse provider tem que ficar DENTRO de
// <ThemeProvider> (ver main.jsx).
export function AccentProvider({ children }) {
  const { theme } = useTheme()
  const [accent, setAccent] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && ACCENTS[saved] ? saved : DEFAULT_ACCENT
  })

  useEffect(() => {
    const tones = resolveAccentTones(accent, theme)
    const root = document.documentElement
    root.style.setProperty('--c-brand', tones.brand)
    root.style.setProperty('--c-brand-rgb', tones.rgb)
    root.style.setProperty('--c-brand-2', tones.brand2)
    root.style.setProperty('--c-brand-fg', tones.fg)
    localStorage.setItem(STORAGE_KEY, accent)
  }, [accent, theme])

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  )
}

export const useAccent = () => useContext(AccentContext)
