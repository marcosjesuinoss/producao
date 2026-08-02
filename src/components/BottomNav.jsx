import { NavLink } from 'react-router-dom'
import { Home, BarChart2, Gauge, FileText, Settings } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Resumo',    icon: Home,      end: true },
  { to: '/acumulado', label: 'Acumulado', icon: BarChart2 },
  { to: '/evolucao', label: 'Evolução', icon: Gauge },
  { to: '/registros', label: 'Registros', icon: FileText  },
  { to: '/ajustes',   label: 'Ajustes',   icon: Settings  },
]

export default function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      style={{
        // Ultimo item da coluna flex do shell (ver App.jsx) — fica no rodape
        // por construcao, sem position:fixed.
        flexShrink: 0,
        zIndex: 20,
        background: 'var(--c-surface)',
        borderTop: '1px solid var(--c-border)',
        boxShadow: 'var(--shadow-nav)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
      }}
    >
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors"
          style={({ isActive }) => ({
            color: isActive ? '#818cf8' : 'var(--text-faint)',
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400 }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
