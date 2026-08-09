import { TrendingUp, Plus, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useRecordModal } from '../context/RecordModalContext.jsx'
import { useMonth } from '../context/MonthContext.jsx'
import { MONTHS } from '../lib/format.js'

const navBtnStyle = {
  width: '24px',
  height: '24px',
  background: 'transparent',
  border: 'none',
  color: 'var(--c-brand)',
  fontSize: '16px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
}

export default function Header({ online }) {
  const { hasPin, lock } = useAuth()
  const { open } = useRecordModal()
  const { year, month, prev, next } = useMonth()

  return (
    <header className="surface border-b" style={{ background: 'var(--c-surface)' }}>
      {/* SVG gradient definition for icon */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="iconGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--c-brand-2)" />
            <stop offset="100%" stopColor="var(--c-brand)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Linha 1: ícone + título + navegação de mês + lock */}
      <div
        className="max-w-5xl mx-auto px-4"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingTop: '12px' }}
      >
        <div style={{ padding: '6px', background: 'var(--c-brand-soft)', borderRadius: '10px', flexShrink: 0 }}>
          <TrendingUp size={24} stroke="url(#iconGrad)" strokeWidth={2} />
        </div>
        <h1 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Produção
        </h1>

        {/* Pill de navegação de mês */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-card)',
            border: '1px solid #2d3748',
            borderRadius: '99px',
            padding: '8px 12px',
            marginLeft: 'auto',
            flexShrink: 0,
          }}
        >
          <button
            onClick={prev}
            aria-label="Mês anterior"
            style={navBtnStyle}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', padding: '0 4px', whiteSpace: 'nowrap' }}>
            {MONTHS[month - 1]} / {year}
          </span>
          <button
            onClick={next}
            aria-label="Próximo mês"
            style={navBtnStyle}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {hasPin && (
          <button className="btn shrink-0 px-2 py-2" onClick={lock} aria-label="Bloquear app">
            <Lock size={16} />
          </button>
        )}
      </div>

      {/* Linha 2: botão novo registro */}
      <div className="max-w-5xl mx-auto px-4 pb-3">
        <button
          className="btn btn-brand w-full sm:w-auto"
          onClick={() => open()}
          aria-label="Novo registro"
        >
          <Plus size={16} />
          Novo registro
        </button>
      </div>
    </header>
  )
}
