import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const THEMES = ['light', 'dark', 'midnight']
const THEME_MIGRATED_KEY = 'themeMigratedV2'

// Persiste tema no localStorage.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    // Migra quem ja tinha "dark" salvo (o escuro antigo, agora chamado
    // "Anoitecer") pro novo nome — mas SO NA PRIMEIRA VEZ (flag abaixo).
    // Sem isso, a conversao rodaria toda vez que o app carrega, e como
    // "dark" agora e tambem o valor legitimo do tema "Escuro" novo, isso
    // jogava quem escolhesse "Escuro" de volta pro "Anoitecer" a cada
    // atualizacao. Leitura pura aqui (sem gravar nada): o inicializador do
    // useState pode ser chamado mais de uma vez pelo StrictMode, e gravar
    // a flag aqui dentro faria a segunda chamada ja achar a flag setada e
    // pular a migracao, revertendo o resultado da primeira chamada.
    if (!localStorage.getItem(THEME_MIGRATED_KEY) && saved === 'dark') return 'midnight'
    if (THEMES.includes(saved)) return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'midnight' : 'light'
  })

  // Marca a migracao como feita so depois do primeiro render — nunca mais
  // reinterpreta um "dark" salvo como o tema antigo depois disso.
  useEffect(() => {
    localStorage.setItem(THEME_MIGRATED_KEY, '1')
  }, [])

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
