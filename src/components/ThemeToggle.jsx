import { useTheme } from '../context/ThemeContext.jsx'

export default function ThemeToggle() {
  const { theme, toggleTheme, fontScale, setFontScale } = useTheme()
  return (
    <div className="flex items-center gap-2">
      {/* Ajuste de fonte (acessibilidade) */}
      <div className="hidden sm:flex items-center gap-1" role="group" aria-label="Tamanho da fonte">
        <button className="btn px-2 py-1" aria-label="Diminuir fonte"
          onClick={() => setFontScale(Math.max(0.9, +(fontScale - 0.1).toFixed(2)))}>A-</button>
        <button className="btn px-2 py-1" aria-label="Aumentar fonte"
          onClick={() => setFontScale(Math.min(1.4, +(fontScale + 0.1).toFixed(2)))}>A+</button>
      </div>
      <button className="btn" onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
        {theme === 'dark' ? '☀️ Claro' : '🌙 Escuro'}
      </button>
    </div>
  )
}
