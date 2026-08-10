import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

// Botão "i" com popup centralizado na tela — portal pro <body>, fixed
// inset-0 + flex center — em vez de ancorado no proprio botao, que
// estourava a borda da tela quando o botao ficava perto da direita.
export default function InfoButton({ id, description, open, onToggle }) {
  const isOpen = open === id
  return (
    <>
      <button
        type="button"
        onClick={() => onToggle(isOpen ? null : id)}
        aria-label="O que é isso?"
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-card-deep)', color: 'var(--text-faint)' }}
      >
        <Info size={12} />
      </button>
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => onToggle(null)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} aria-hidden />
          <div
            role="status"
            className="relative w-full max-w-sm p-4 shadow-lg"
            style={{
              backgroundColor: 'var(--c-surface)',
              backgroundImage: 'linear-gradient(rgba(var(--c-brand-rgb),0.12), rgba(var(--c-brand-rgb),0.12))',
              border: '1.5px solid var(--c-brand)',
              borderRadius: '14px',
              fontSize: '14px',
              lineHeight: '1.5',
              color: 'var(--text-primary)',
            }}
          >
            {description}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
