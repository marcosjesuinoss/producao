import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const THEMES = ['light', 'dark', 'midnight']

// Persiste tema no localStorage.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    // Migra quem ja tinha "dark" salvo (o escuro antigo, agora chamado
    // "meia noite") pro novo nome — senao essas pessoas veriam o tema preto
    // novo trocado sem ter escolhido isso.
    if (saved === 'dark') return 'midnight'
    if (THEMES.includes(saved)) return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'midnight' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', theme === 'dark')
    document.documentElement.classList.toggle('theme-midnight', theme === 'midnight')
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
