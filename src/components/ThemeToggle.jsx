import { useTheme } from '../context/ThemeContext.jsx'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="flex items-center gap-2">
      <button className="btn" onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
        {theme === 'dark' ? '☀️ Claro' : '🌙 Escuro'}
      </button>
    </div>
  )
}
