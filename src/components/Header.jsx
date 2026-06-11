import { NavLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const tabs = [
  { to: '/', label: 'Resumo', end: true },
  { to: '/registros', label: 'Registros' },
  { to: '/metas', label: 'Metas' },
  { to: '/graficos', label: 'Graficos' },
  { to: '/ajustes', label: 'Ajustes' }
]

export default function Header({ online }) {
  const { hasPin, lock } = useAuth()
  return (
    <header className="surface border-b sticky top-0 z-10" style={{ background: 'var(--c-surface)' }}>
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-xl" aria-hidden>📊</span>
          <h1 className="font-bold text-lg">Controle de Producao</h1>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: online ? 'var(--c-brand-soft)' : 'var(--c-border)', color: 'var(--c-fg)' }}
            title={online ? 'Online' : 'Offline'}>
            {online ? 'online' : 'offline'}
          </span>
        </div>
        <ThemeToggle />
        {hasPin && (
          <button className="btn" onClick={lock} aria-label="Bloquear app">🔒</button>
        )}
      </div>
      <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto" aria-label="Navegacao principal">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) =>
              'px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ' +
              (isActive ? 'border-current text-[color:var(--c-brand)]' : 'border-transparent text-muted')
            }>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
