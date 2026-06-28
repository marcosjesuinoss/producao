import { NavLink } from 'react-router-dom'
import { Home, BarChart2, FileText, Settings } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Resumo',    icon: Home,      end: true },
  { to: '/acumulado', label: 'Acumulado', icon: BarChart2 },
  { to: '/registros', label: 'Registros', icon: FileText  },
  { to: '/ajustes',   label: 'Ajustes',   icon: Settings  },
]

export default function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: 'var(--c-surface)',
        borderTop: '1px solid var(--c-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
      }}
    >
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
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
