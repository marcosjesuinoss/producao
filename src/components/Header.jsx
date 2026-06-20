import { NavLink, useLocation } from 'react-router-dom'
import { TrendingUp, Plus, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useRecordModal } from '../context/RecordModalContext.jsx'

const tabs = [
  { to: '/', label: 'Resumo', end: true },
  { to: '/registros', label: 'Registros' },
  { to: '/metas', label: 'Metas' },
  { to: '/graficos', label: 'Graficos' },
  { to: '/ajustes', label: 'Ajustes' }
]

const activeStyle = {
  color: '#818cf8',
  borderBottomColor: '#818cf8',
  background: 'rgba(99,102,241,0.12)',
}
const inactiveStyle = {
  color: 'var(--text-faint)',
  borderBottomColor: 'transparent',
  background: 'transparent',
}

export default function Header({ online }) {
  const { hasPin, lock } = useAuth()
  const { open } = useRecordModal()

  return (
    <header className="surface border-b sticky top-0 z-10" style={{ background: 'var(--c-surface)' }}>
      {/* SVG gradient definition for icon */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="iconGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Linha 1: título + status + lock */}
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 mr-auto min-w-0">
          <div style={{ padding: '6px', background: 'rgba(99,102,241,0.12)', borderRadius: '10px', shrink: 0 }}>
            <TrendingUp size={24} stroke="url(#iconGrad)" strokeWidth={2} />
          </div>
          <h1 className="font-bold text-lg truncate" style={{ color: 'var(--text-primary)' }}>
            Controle de Producao
          </h1>
          <span
            className="text-xs px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: online ? 'var(--c-brand-soft)' : 'var(--c-border)',
              color: online ? 'var(--c-brand)' : 'var(--text-faint)',
            }}
            title={online ? 'Online' : 'Offline'}
          >
            {online ? 'online' : 'offline'}
          </span>
        </div>
        {hasPin && (
          <button className="btn shrink-0 px-2 py-2" onClick={lock} aria-label="Bloquear app">
            <Lock size={16} />
          </button>
        )}
      </div>

      {/* Linha 2: botão novo registro */}
      <div className="max-w-5xl mx-auto px-4 pb-2">
        <button
          className="btn btn-brand w-full sm:w-auto"
          onClick={() => open()}
          aria-label="Novo registro"
        >
          <Plus size={16} />
          Novo registro
        </button>
      </div>

      {/* Linha 3: abas de navegação */}
      <nav
        className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto border-t"
        style={{ borderColor: 'var(--c-border)' }}
        aria-label="Navegacao principal"
      >
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className="inline-flex items-center whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition-colors"
            style={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
